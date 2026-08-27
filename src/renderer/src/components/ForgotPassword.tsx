import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { ArrowLeft, Shield, CheckCircle2 } from 'lucide-react'

interface ForgotPasswordProps {
  onBack: () => void
}

type Step = 'username' | 'questions' | 'newPassword' | 'success'

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('username')
  const [username, setUsername] = useState('')
  const [questions, setQuestions] = useState<{
    question1: string
    question2: string
    question3: string
  } | null>(null)
  const [answers, setAnswers] = useState({
    answer1: '',
    answer2: '',
    answer3: ''
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const securityQuestions = await window.api.auth.getSecurityQuestions(username)
      setQuestions(securityQuestions)
      setStep('questions')
    } catch (err: any) {
      // User-friendly error messages
      const errorMessage = err.message || 'Unable to retrieve security questions'
      
      if (errorMessage.includes('not been configured')) {
        setError('Security questions have not been set up for this account. Please contact your system administrator.')
      } else if (errorMessage.includes('not found')) {
        setError('Username not found. Please check your username and try again.')
      } else if (errorMessage.includes('locked')) {
        setError(errorMessage) // Already user-friendly
      } else {
        setError('Unable to proceed with password recovery. Please contact your system administrator.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!answers.answer1 || !answers.answer2 || !answers.answer3) {
      setError('Please answer all three security questions')
      return
    }

    setStep('newPassword')
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const result = await window.api.auth.verifyAndResetPassword({
        username,
        answers,
        newPassword
      })

      if (result.success) {
        setStep('success')
      }
    } catch (err: any) {
      // User-friendly error messages
      const errorMessage = err.message || 'Password reset failed'
      
      if (errorMessage.includes('Invalid security answers') || errorMessage.includes('remaining')) {
        setError(errorMessage) // Already user-friendly with attempt count
      } else if (errorMessage.includes('locked')) {
        setError(errorMessage) // Already user-friendly with time
      } else if (errorMessage.includes('not been configured')) {
        setError('Security questions are not configured. Please contact your administrator.')
      } else {
        setError('Unable to reset password. Please try again or contact your administrator.')
      }
    } finally {
      setLoading(false)
    }
  }

  const renderUsernameStep = () => (
    <form onSubmit={handleUsernameSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          autoFocus
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
        <Button type="submit" disabled={loading || !username} className="flex-1">
          {loading ? 'Loading...' : 'Continue'}
        </Button>
      </div>
    </form>
  )

  const renderQuestionsStep = () => (
    <form onSubmit={handleQuestionsSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="answer1">{questions?.question1}</Label>
          <Input
            id="answer1"
            value={answers.answer1}
            onChange={(e) => setAnswers({ ...answers, answer1: e.target.value })}
            placeholder="Your answer"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer2">{questions?.question2}</Label>
          <Input
            id="answer2"
            value={answers.answer2}
            onChange={(e) => setAnswers({ ...answers, answer2: e.target.value })}
            placeholder="Your answer"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer3">{questions?.question3}</Label>
          <Input
            id="answer3"
            value={answers.answer3}
            onChange={(e) => setAnswers({ ...answers, answer3: e.target.value })}
            placeholder="Your answer"
            required
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStep('username')
            setAnswers({ answer1: '', answer2: '', answer3: '' })
            setError('')
          }}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          Continue
        </Button>
      </div>
    </form>
  )

  const renderNewPasswordStep = () => (
    <form onSubmit={handlePasswordReset} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
            autoFocus
            minLength={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength={4}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStep('questions')
            setNewPassword('')
            setConfirmPassword('')
            setError('')
          }}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </div>
    </form>
  )

  const renderSuccessStep = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Password Reset Successful!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your password has been reset successfully. You can now login with your new password.
          </p>
        </div>
      </div>

      <Button onClick={onBack} className="w-full">
        Back to Login
      </Button>
    </div>
  )

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>Password Recovery</CardTitle>
        </div>
        <CardDescription>
          {step === 'username' && 'Enter your username to begin password recovery'}
          {step === 'questions' && 'Answer your security questions'}
          {step === 'newPassword' && 'Set your new password'}
          {step === 'success' && 'Recovery complete'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'username' && renderUsernameStep()}
        {step === 'questions' && renderQuestionsStep()}
        {step === 'newPassword' && renderNewPasswordStep()}
        {step === 'success' && renderSuccessStep()}
      </CardContent>
    </Card>
  )
}
