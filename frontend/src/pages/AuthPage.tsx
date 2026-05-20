import {useState} from 'react'
import {LoginForm} from '../components/ui/auth/LoginForm'
import {RegisterForm} from '../components/ui/auth/RegisterForm'

type Tab = 'login' | 'register'

function Logo() {
    return (
        <div className="logo-row">
            <div className="logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)"
                     strokeWidth="2.5">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <path d="M2 10h20M6 15h4"/>
                </svg>
            </div>
            <span className="logo-text">NaPół</span>
            <span className="logo-dot">.</span>
        </div>
    )
}

function GridBg() {
    return (
        <svg aria-hidden style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.04
        }} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--color-accent)" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
    )
}

function TabBar({active, onChange}: { active: Tab; onChange: (t: Tab) => void }) {
    return (
        <div className="tabs">
            {/* Generowanie przycisków zakładek (Logowanie / Rejestracja) na podstawie typu Tab */}
            {(['login', 'register'] as Tab[]).map((tab) => (
                <button
                    key={tab}
                    type="button"
                    onClick={() => onChange(tab)}
                    className={`tab ${active === tab ? 'tab-active' : ''}`}
                >
                    {tab === 'login' ? 'Logowanie' : 'Rejestracja'}
                </button>
            ))}
            {/* left jest dynamiczne — jedyny uzasadniony inline style */}
            <div className="tab-indicator" style={{left: active === 'login' ? '4px' : 'calc(50%)'}}/>
        </div>
    )
}

export function AuthPage() {
    // Stan przechowujący aktualnie wybraną zakładkę (logowanie lub rejestracja)
    const [tab, setTab] = useState<Tab>('login')

    return (
        <div className="auth-page">
            <GridBg/>
            <main className="auth-card">
                <Logo/>
                
                {/* Komponent z zakładkami pozwalający na przełączanie między logowaniem a rejestracją */}
                <TabBar active={tab} onChange={setTab}/>
                
                {/* Wyświetlanie odpowiedniego formularza (logowania lub rejestracji) w zależności od wybranej zakładki.
                    Użycie atrybutu key={tab} wymusza ponowne renderowanie elementu przy zmianie zakładki, co umożliwia np. animację. */}
                <div className="animate-fade-in" key={tab}>
                    {tab === 'login' ? <LoginForm/> : <RegisterForm/>}
                </div>
                
                {/* Tekst zachęcający do przejścia na drugą zakładkę w zależności od obecnego stanu */}
                <p className="switch-text">
                    {tab === 'login' ? 'Nie masz jeszcze konta?' : 'Masz już konto?'}{' '}
                    <button type="button" className="btn-switch"
                            onClick={() => setTab(tab === 'login' ? 'register' : 'login')}>
                        {tab === 'login' ? 'Zarejestruj się' : 'Zaloguj się'}
                    </button>
                </p>
            </main>
        </div>
    )
}
