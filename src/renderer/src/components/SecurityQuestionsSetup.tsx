import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Shield, Info } from 'lucide-react'

interface SecurityQuestionsSetupProps {
  userId: number
  onComplete: () => void
  onSkip?: () => void
  isOptional?: boolean
}

export function SecurityQuestionsSetup({
  userId,
  onComplete,
  onSkip,
  isOptional = false
}: SecurityQuestionsSetupProps) {
  const [predefinedQuestions, setPredefinedQuestions] = useState<string[]>([])
  const [formData, setFormData] = useState({
    question1: '',
    answer1: '',
    question2: '',
    answer2: '',
    question3: '',
    answer3: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPredefinedQuestions()
  }, [])

  const loadPredefinedQuestions = async () => {
    try {
      const questions = await window.api.auth.getPredefinedQuestions()
      setPredefinedQuestions(questions)
    } catch (err) {
      console.error('Failed to load predefined questions:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (
      !formData.question1 ||
      !formData.answer1 ||
      !formData.question2 ||
      !formData.answer2 ||
      !formData.question3 ||
      !formData.answer3
    ) {
      setError('Please select all questions and provide answers')
      return
    }

    if (formData.answer1.length < 2 || formData.answer2.length < 2 || formData.answer3.length < 2) {
      setError('All answers must be at least 2 characters long')
      return
    }

    // Check for duplicate questions
    const questions = [formData.question1, formData.question2, formData.question3]
    if (new Set(questions).size !== 3) {
      setError('Please select three different security questions')
      return
    }

    setLoading(true)

    try {
      await window.api.auth.setSecurityQuestions(formData, userId)
      onComplete()
    } catch (err: any) {
      setError(err.message || 'Failed to set security questions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Set Up Security Questions</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Security questions help you recover your account if you forget your password. Choose
          questions with answers only you would know.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Your answers are case-insensitive and will be encrypted. Make sure you remember them!
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question 1 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium text-sm">Security Question 1</h4>
          <div className="space-y-2">
            <Label htmlFor="question1">Question</Label>
            <Select
              value={formData.question1}
              onValueChange={(value) => setFormData({ ...formData, question1: value })}
            >
              <SelectTrigger id="question1">
                <SelectValue placeholder="Select a question" />
              </SelectTrigger>
              <SelectContent>
                {predefinedQuestions.map((question, index) => (
                  <SelectItem
                    key={index}
                    value={question}
                    disabled={question === formData.question2 || question === formData.question3}
                  >
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer1">Answer</Label>
            <Input
              id="answer1"
              value={formData.answer1}
              onChange={(e) => setFormData({ ...formData, answer1: e.target.value })}
              placeholder="Your answer"
              required
              minLength={2}
            />
          </div>
        </div>

        {/* Question 2 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium text-sm">Security Question 2</h4>
          <div className="space-y-2">
            <Label htmlFor="question2">Question</Label>
            <Select
              value={formData.question2}
              onValueChange={(value) => setFormData({ ...formData, question2: value })}
            >
              <SelectTrigger id="question2">
                <SelectValue placeholder="Select a question" />
              </SelectTrigger>
              <SelectContent>
                {predefinedQuestions.map((question, index) => (
                  <SelectItem
                    key={index}
                    value={question}
                    disabled={question === formData.question1 || question === formData.question3}
                  >
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer2">Answer</Label>
            <Input
              id="answer2"
              value={formData.answer2}
              onChange={(e) => setFormData({ ...formData, answer2: e.target.value })}
              placeholder="Your answer"
              required
              minLength={2}
            />
          </div>
        </div>

        {/* Question 3 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium text-sm">Security Question 3</h4>
          <div className="space-y-2">
            <Label htmlFor="question3">Question</Label>
            <Select
              value={formData.question3}
              onValueChange={(value) => setFormData({ ...formData, question3: value })}
            >
              <SelectTrigger id="question3">
                <SelectValue placeholder="Select a question" />
              </SelectTrigger>
              <SelectContent>
                {predefinedQuestions.map((question, index) => (
                  <SelectItem
                    key={index}
                    value={question}
                    disabled={question === formData.question1 || question === formData.question2}
                  >
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer3">Answer</Label>
            <Input
              id="answer3"
              value={formData.answer3}
              onChange={(e) => setFormData({ ...formData, answer3: e.target.value })}
              placeholder="Your answer"
              required
              minLength={2}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {isOptional && onSkip && (
            <Button type="button" variant="outline" onClick={onSkip} className="flex-1">
              Skip for Now
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Security Questions'}
          </Button>
        </div>
      </form>
    </div>
  )
}
