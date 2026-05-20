import {useState} from 'react'
import {Button, ErrorBanner, TextInput} from '../index'
import {useAuth} from '../../../hooks/useAuth'

const EmailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
    </svg>
)

const LockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
)

export function LoginForm() {
    // Hook używany do zarządzania logowaniem i wyświetlaniem błędów/stanu ładowania
    const {login, loading, error, clearError} = useAuth()
    
    // Lokalne stany dla pól formularza
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Obsługa wysłania formularza
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault() // Zapobiega domyślnemu odświeżeniu strony
        login({email, password}) // Wywołanie funkcji logowania przekazanej z hooka
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <TextInput label="Adres e-mail" type="email" value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder="jan@kowalski.pl" iconLeft={<EmailIcon/>}
                       autoComplete="email" required/>
                       
            <TextInput label="Hasło" value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       placeholder="••••••••" iconLeft={<LockIcon/>}
                       revealable autoComplete="current-password" required/>
                       
            {/* Wyświetlanie baneru błędu w przypadku nieudanego logowania */}
            <ErrorBanner message={error} onDismiss={clearError}/>
            
            <Button type="submit" fullWidth loading={loading}>Zaloguj się</Button>
        </form>
    )
}
