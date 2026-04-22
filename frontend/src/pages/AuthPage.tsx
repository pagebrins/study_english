import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAuth } from '../hooks/useAuth'

/**
 * Login and register page.
 */
export const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [localMessage, setLocalMessage] = useState('')
  const { token, loading, error, login, register, resetPassword } = useAuth()

  if (token) return <Navigate to="/" replace />

  const submit = async () => {
    setLocalMessage('')
    if (isResetMode) {
      if (password !== confirmPassword) {
        setLocalMessage('Two passwords are not the same.')
        return
      }
      try {
        await resetPassword({ email, new_password: password })
        setLocalMessage('Password reset completed. Please sign in with your new password.')
        setIsResetMode(false)
        setPassword('')
        setConfirmPassword('')
      } catch {
        // The global auth error message is shown by store state.
      }
      return
    }
    if (isRegister) {
      await register({ email, password, name, phone })
      return
    }
    await login({ email, password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md space-y-3">
        <h1 className="text-xl font-semibold">{isResetMode ? 'Reset password' : isRegister ? 'Register' : 'Login'}</h1>
        {isRegister && !isResetMode && <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />}
        {isRegister && !isResetMode && (
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        )}
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          placeholder={isResetMode ? 'New password' : 'Password'}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {isResetMode && (
          <Input
            placeholder="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {localMessage && <p className="text-sm text-zinc-300">{localMessage}</p>}
        <Button className="w-full" onClick={submit} disabled={loading}>
          {loading ? 'Loading...' : isResetMode ? 'Reset password' : isRegister ? 'Create account' : 'Sign in'}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setIsRegister((v) => !v)
            setIsResetMode(false)
            setLocalMessage('')
          }}
        >
          {isRegister ? 'Have an account? Login' : 'No account? Register'}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setIsResetMode((v) => !v)
            setIsRegister(false)
            setPassword('')
            setConfirmPassword('')
            setLocalMessage('')
          }}
        >
          {isResetMode ? 'Back to Login' : 'Forgot password?'}
        </Button>
      </Card>
    </div>
  )
}
