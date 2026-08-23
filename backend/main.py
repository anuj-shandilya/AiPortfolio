import re
import json
import os
import asyncio
from pathlib import Path
from typing import Optional, AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from groq import Groq
from pydantic import BaseModel
from pypdf import PdfReader
import httpx
from bs4 import BeautifulSoup

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
model = "openai/gpt-oss-120b"

app = FastAPI(title="Portfolio Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#for cleaner output
def clean_response(text: str) -> str:
    """Removes markdown artifacts: **bold**, *italic*, stray asterisks, excess newlines."""
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'\1', text)   # ***text***
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)         # **text**
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'\1', text)  # *text*
    text = re.sub(r'\*+', '', text)                      # stray *
    text = re.sub(r'\n{3,}', '\n\n', text)               # excess newlines
    lines = [line.strip() for line in text.split('\n')]
    return '\n'.join(lines).strip()
# -------------------------------
# Pydantic Models
# -------------------------------
class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = []

class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    total_experience_years: float | None = None
    skills: list[str] = []
    experiences: list[Experience] = []
    education: list[str] = []
    projects: list[str] = []
    certifications: list[str] = []

class ChatRequest(BaseModel):
    question: str

class JDAnalysisResponse(BaseModel):
    verdict: str
    score: int
    reasoning: str
    matching_skills: list[str]
    missing_skills: list[str]

# -------------------------------
# Resume Parsing & Caching
# -------------------------------
resume_schema = Resume.model_json_schema()
_resume_cache: Optional[Resume] = None
_resume_text_cache: Optional[str] = None

def read_pdf(file_path: Path) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def parse_resume(resume_text: str) -> Resume:
    system_prompt = f"""
    You are an expert resume parser.
    Extract information from the resume based on its meaning,
    not only based on exact section headings.
    Different resumes may use different headings.
    For example:
    - Experience, Professional Experience, Work History, Employment, Internships
    These may all contain relevant experience.
    Skills may also appear in the skills section, work experience, internships or projects.
    Return ONLY valid JSON matching this schema:
    {resume_schema}
    Important rules:
    1. Do not invent information.
    2. If a value is not available, return null.
    3. If a list has no information, return an empty list.
    4. Include internships inside experiences.
    5. Extract skills mentioned across the entire resume.
    """
    user_prompt = f"Parse the following resume:\n\n{resume_text}"
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.1
    )
    raw_output = response.choices[0].message.content
    data = json.loads(raw_output)
    return Resume(**data)

async def get_resume() -> tuple[Resume, str]:
    global _resume_cache, _resume_text_cache
    if _resume_cache is None or _resume_text_cache is None:
        resume_path = Path("my_resume.pdf")
        if not resume_path.exists():
            raise HTTPException(status_code=500, detail="Resume file not found on server")
        text = read_pdf(resume_path)
        resume = parse_resume(text)
        _resume_cache = resume
        _resume_text_cache = text
    return _resume_cache, _resume_text_cache

# -------------------------------
# GitHub Data Fetching
# -------------------------------
async def fetch_github_data(username: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        user_resp = await client.get(f"https://api.github.com/users/{username}")
        user_resp.raise_for_status()
        user_data = user_resp.json()

        repos_resp = await client.get(f"https://api.github.com/users/{username}/repos?per_page=100")
        repos_resp.raise_for_status()
        repos_data = repos_resp.json()

    total_stars = sum(repo.get("stargazers_count", 0) for repo in repos_data)
    total_forks = sum(repo.get("forks_count", 0) for repo in repos_data)
    languages = {}
    for repo in repos_data:
        lang = repo.get("language")
        if lang:
            languages[lang] = languages.get(lang, 0) + 1

    top_repos = sorted(repos_data, key=lambda r: r.get("stargazers_count", 0), reverse=True)[:5]

    return {
        "profile": {
            "name": user_data.get("name"),
            "bio": user_data.get("bio"),
            "avatar_url": user_data.get("avatar_url"),
            "html_url": user_data.get("html_url"),
            "public_repos": user_data.get("public_repos"),
            "followers": user_data.get("followers"),
            "following": user_data.get("following"),
            "created_at": user_data.get("created_at"),
        },
        "stats": {
            "total_stars": total_stars,
            "total_forks": total_forks,
            "languages": languages,
        },
        "top_repos": top_repos,
    }

# -------------------------------
# LeetCode Data Fetching (Primary: alfa-leetcode-api)
# -------------------------------
async def fetch_leetcode_data_alfa(username: str) -> dict:
    """
    Fetch LeetCode data from the alfa-leetcode-api.
    Base URL: https://alfa-leetcode-api.onrender.com
    Endpoint: /{username}
    Timeout: 5 seconds (as requested)
    """
    url = f"https://alfa-leetcode-api.onrender.com/{username}"
    # Use a 5-second timeout and a few retries
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=2.0, follow_redirects=True) as client:
                response = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json",
                })
                print(f"alfa-leetcode-api attempt {attempt+1} status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    # Ensure the response contains expected fields
                    if "totalSolved" in data:
                        return {
                            "total_solved": data.get("totalSolved", 0),
                            "easy_solved": data.get("easySolved", 0),
                            "medium_solved": data.get("mediumSolved", 0),
                            "hard_solved": data.get("hardSolved", 0),
                            "acceptance_rate": data.get("acceptanceRate", 0),
                            "ranking": data.get("ranking", 0),
                            "contribution_points": data.get("contributionPoints", 0),
                            "reputation": data.get("reputation", 0),
                            "profile_url": f"https://leetcode.com/u/{username}/",
                        }
                    else:
                        print(f"alfa-leetcode-api unexpected response: {data}")
                        return {"error": "Unexpected response format from alfa API"}
                else:
                    print(f"alfa-leetcode-api returned status {response.status_code}")
            # Wait 1 second before retrying (optional)
            await asyncio.sleep(1)
        except Exception as e:
            print(f"alfa-leetcode-api attempt {attempt+1} failed: {str(e)}")
            await asyncio.sleep(1)
    return {"error": "alfa-leetcode-api failed after 3 attempts"}

async def fetch_leetcode_data_graphql(username: str) -> dict:
    """
    Fallback: LeetCode GraphQL API (with session to obtain cookies).
    """
    profile_url = f"https://leetcode.com/u/{username}/"
    graphql_url = "https://leetcode.com/graphql"
    query = """
    query userProfile($username: String!) {
        matchedUser(username: $username) {
            username
            submitStats {
                acSubmissionNum { difficulty count submissions }
                totalSubmissionNum { difficulty count submissions }
            }
            profile { ranking reputation starRating }
        }
    }
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": profile_url,
        "Origin": "https://leetcode.com",
        "Connection": "keep-alive",
    }
    try:
        async with httpx.AsyncClient(headers=headers, timeout=10.0, follow_redirects=True) as client:
            # Step 1: Visit profile to establish cookies
            r = await client.get(profile_url)
            print(f"GraphQL: profile page status {r.status_code}")
            # Step 2: GraphQL request
            resp = await client.post(
                graphql_url,
                json={"query": query, "variables": {"username": username}},
            )
            print(f"GraphQL status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and data["data"] and "matchedUser" in data["data"]:
                    user = data["data"]["matchedUser"]
                    ac_sub = user.get("submitStats", {}).get("acSubmissionNum", [])
                    total_solved = 0
                    easy = 0
                    medium = 0
                    hard = 0
                    for item in ac_sub:
                        diff = item.get("difficulty", "").lower()
                        count = item.get("count", 0)
                        if diff == "all":
                            total_solved = count
                        elif diff == "easy":
                            easy = count
                        elif diff == "medium":
                            medium = count
                        elif diff == "hard":
                            hard = count
                    total_sub = user.get("submitStats", {}).get("totalSubmissionNum", [])
                    total_ac = 0
                    total_all = 0
                    for item in total_sub:
                        if item.get("difficulty", "").lower() == "all":
                            total_all = item.get("submissions", 0)
                    for item in ac_sub:
                        if item.get("difficulty", "").lower() == "all":
                            total_ac = item.get("submissions", 0)
                    acceptance_rate = (total_ac / total_all * 100) if total_all > 0 else 0
                    return {
                        "total_solved": total_solved,
                        "easy_solved": easy,
                        "medium_solved": medium,
                        "hard_solved": hard,
                        "acceptance_rate": round(acceptance_rate, 2),
                        "ranking": user.get("profile", {}).get("ranking", 0),
                        "reputation": user.get("profile", {}).get("reputation", 0),
                        "profile_url": profile_url,
                    }
                else:
                    return {"error": "GraphQL returned no data"}
            else:
                return {"error": f"GraphQL status {resp.status_code}"}
    except Exception as e:
        return {"error": f"GraphQL failed: {str(e)}"}

async def fetch_leetcode_data_scraping(username: str) -> dict:
    """
    Last resort: Scrape LeetCode profile page.
    """
    url = f"https://leetcode.com/u/{username}/"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        total_solved = 0
        solved_elems = soup.find_all(string=lambda text: text and "Solved" in text)
        for elem in solved_elems:
            parent = elem.find_parent()
            if parent:
                numbers = [int(s) for s in parent.get_text().split() if s.isdigit()]
                if numbers:
                    total_solved = numbers[0]
                    break
        return {
            "total_solved": total_solved,
            "easy_solved": 0,
            "medium_solved": 0,
            "hard_solved": 0,
            "acceptance_rate": 0,
            "ranking": 0,
            "profile_url": url,
        }
    except Exception as e:
        return {"error": str(e)}

# -------------------------------
# JD Analysis
# -------------------------------
async def analyze_jd_with_resume(jd_text: str) -> JDAnalysisResponse:
    resume, _ = await get_resume()
    system_prompt = f"""
    You are a hiring assistant. Compare the job description (JD) with the candidate's resume.
    Candidate resume (JSON):
    {resume.model_dump_json(indent=2)}

    Job Description:
    {jd_text}

    Provide a structured analysis:
    - verdict: "Strong Match", "Good Match", "Moderate Match", or "Weak Match"
    - score: integer 0-100 representing overall fit
    - reasoning: detailed explanation of the verdict
    - matching_skills: list of skills from the JD that the candidate has
    - missing_skills: list of important skills from the JD that the candidate lacks
    -donot respond with asteriks for more emphasis

    Return JSON matching the JDAnalysisResponse schema. 
    """
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_prompt}],
        response_format={"type": "json_object"},
        temperature=0.2
    )
    raw = response.choices[0].message.content
    data = json.loads(raw)
    return JDAnalysisResponse(**data)

# -------------------------------
# Streaming Chat
# -------------------------------
async def stream_chat_response(question: str) -> AsyncGenerator[str, None]:
    resume, _ = await get_resume()
    resume_json = resume.model_dump_json(indent=2)
    
    system_prompt = f"""You are Anuj Shandilya's professional AI assistant. You are being interviewed by a recruiter or hiring manager.

CANDIDATE INFORMATION:
{resume_json}

STRICT RULES:
1. Answer ONLY using the resume info above. Never hallucinate.
2. Speak in first person: "I", "my", "me" — as if YOU are Anuj.
3. Be professional, confident, and concise (3-6 sentences per point).
4. When mentioning skills, briefly explain HOW they were used in projects/work.
5. If asked something not in the resume, say: "I don't have that in my records, but I'd be happy to discuss it."
6. NEVER use markdown. No asterisks, no bold, no italics, no bullet points with stars, no # headers.
7. Use plain text only. Use "1." or "2." for lists if needed. Use "-" not "*".
8. Keep paragraphs natural. No excessive line breaks.
9. End with a brief, confident closing."""

    print(f"[CHAT] Question: {question}")
    
    stream = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ],
        stream=True,
        temperature=0.4,
        max_tokens=800,
    )
    
    buffer = ""
    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            buffer += chunk.choices[0].delta.content
            # Clean and flush buffer periodically
            if len(buffer) > 30:
                yield clean_response(buffer)
                buffer = ""
            await asyncio.sleep(0.01)
    
    if buffer:
        yield clean_response(buffer)

# -------------------------------
# API Endpoints
# -------------------------------
@app.get("/")
async def home():
    return {"message": "Portfolio API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/github")
async def github_dashboard():
    try:
        data = await fetch_github_data("anuj-shandilya")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch GitHub data: {str(e)}")

@app.get("/api/leetcode")
async def leetcode_dashboard():
    username = "_anuj_shandilya"

    # 1. Try alfa-leetcode-api (primary, with 5s timeout)
    data = await fetch_leetcode_data_alfa(username)
    if not data.get("error"):
        return data

    # 2. Fallback to GraphQL (with session)
    data = await fetch_leetcode_data_graphql(username)
    if not data.get("error"):
        return data

    # 3. Last resort: scraping
    data = await fetch_leetcode_data_scraping(username)
    if not data.get("error"):
        return data

    # 4. Static fallback if available
    fallback_path = Path("leetcode_data.json")
    if fallback_path.exists():
        with open(fallback_path) as f:
            return json.load(f)

    # 5. If everything fails
    return JSONResponse(
        status_code=200,
        content={
            "total_solved": 0,
            "easy_solved": 0,
            "medium_solved": 0,
            "hard_solved": 0,
            "acceptance_rate": 0,
            "ranking": 0,
            "profile_url": f"https://leetcode.com/u/{username}/",
            "error": "All LeetCode data sources failed"
        }
    )

@app.get("/api/resume")
async def get_resume_info():
    resume, _ = await get_resume()
    return resume

@app.get("/api/download-resume")
async def download_resume():
    resume_path = Path("my_resume.pdf")
    if not resume_path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")
    return FileResponse(
        path=resume_path,
        filename="Anuj_Shandilya_Resume.pdf",
        media_type="application/pdf"
    )

@app.post("/api/chat/stream")
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    async def event_generator():
        try:
            async for token in stream_chat_response(request.question):
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"[CHAT ERROR] {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@app.post("/api/analyze-jd")
async def analyze_jd_endpoint(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    filename = file.filename.lower()
    if filename.endswith(".pdf"):
        temp_path = Path("temp_jd.pdf")
        temp_path.write_bytes(content)
        try:
            jd_text = read_pdf(temp_path)
        finally:
            temp_path.unlink()
    else:
        jd_text = content.decode("utf-8", errors="ignore")

    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from JD file.")

    analysis = await analyze_jd_with_resume(jd_text)
    return analysis