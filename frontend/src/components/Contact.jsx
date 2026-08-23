import { useState } from 'react'

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [submitted, setSubmitted] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // TODO: Connect to your backend API
        console.log('Form submitted:', formData)
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 3000)
    }

    const handleEmailClick = () => {
        window.location.href = 'mailto:anujshandilya3@gmail.com'
    }

    const handleLinkedInClick = () => {
        window.open('https://www.linkedin.com/in/anuj-shandilya-290b4025a/', '_blank')
    }

    const handleGitHubClick = () => {
        window.open('https://github.com/anuj-shandilya', '_blank')
    }

    return (
        <div className="contact-grid">
            <div className="contact-info">
                <div className="contact-item" onClick={handleEmailClick} style={{ cursor: 'pointer' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>Email</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            anujshandilya3@gmail.com
                        </div>
                    </div>
                </div>
                <div className="contact-item" onClick={handleLinkedInClick} style={{ cursor: 'pointer' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>LinkedIn</div>
                        <div style={{ color: 'var(--text)', fontSize: '0.9rem' }}>
                            linkedin.com/in/anuj-shandilya-290b4025a
                        </div>
                    </div>
                </div>
                <div className="contact-item" onClick={handleGitHubClick} style={{ cursor: 'pointer' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>GitHub</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            github.com/anuj-shandilya
                        </div>
                    </div>
                </div>
                <div className="contact-item">
                    <div>
                        <div style={{ fontWeight: 600 }}>Location</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            India
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Subject</label>
                    <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="What's this about?"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Message</label>
                    <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Your message..."
                        required
                    />
                </div>
                <button type="submit" className="btn" style={{ width: '100%' }}>
                    {submitted ? 'Sent!' : 'Send Message'}
                </button>
            </form>
        </div>
    )
}

export default Contact