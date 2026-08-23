import Contact from '../components/Contact'

function ContactPage() {
    return (
        <div className="page-container">
            <div className="container">
                <div className="page-header fade-in">
                    <h1>Contact</h1>
                    <p>Get in touch for collaborations, opportunities, or just to say hi!</p>
                </div>
                <Contact />
            </div>
        </div>
    )
}

export default ContactPage