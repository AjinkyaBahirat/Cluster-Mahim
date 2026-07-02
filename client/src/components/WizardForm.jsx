import React, { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const WizardForm = ({ steps, onSubmit, onCancel, submitLabel = 'Submit' }) => {
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(() => {
    const initial = {}
    steps.forEach((step) => {
      step.fields.forEach((field) => {
        initial[field.name] = field.defaultValue !== undefined ? field.defaultValue : (field.type === 'stepper' || field.type === 'number' ? 0 : '')
      })
    })
    return initial
  })
  const [errors, setErrors] = useState({})

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleStepperChange = (name, delta, min = 0, max = Infinity) => {
    const currentVal = Number(formData[name]) || 0
    const newVal = Math.max(min, Math.min(max, currentVal + delta))
    handleChange(name, newVal)
  }

  const validateStep = () => {
    const stepFields = steps[currentStep].fields
    const stepErrors = {}
    let isValid = true

    stepFields.forEach((field) => {
      if (field.required && !formData[field.name] && formData[field.name] !== 0) {
        stepErrors[field.name] = `${field.label} is required`
        isValid = false
      }
    })

    setErrors(stepErrors)
    return isValid
  }

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateStep()) {
      onSubmit(formData)
    }
  }

  const progressPercent = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="wizard">
      <div className="wizard__progress">
        <div className="wizard__progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="wizard__steps-indicator">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={`wizard__step-dot ${idx === currentStep ? 'wizard__step-dot--active' : ''} ${
              idx < currentStep ? 'wizard__step-dot--completed' : ''
            }`}
          ></div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="wizard__step-content">
        <h4 className="wizard__step-title">{steps[currentStep].title}</h4>

        {steps[currentStep].fields.map((field) => (
          <div key={field.name} className="form-group">
            <label className="form-label">{field.label}</label>

            {field.type === 'select' ? (
              <select
                className="form-input form-select"
                value={formData[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
              >
                <option value="">Select option...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'stepper' ? (
              <div className="stepper">
                <button
                  type="button"
                  className="stepper__btn"
                  onClick={() => handleStepperChange(field.name, -1, field.min, field.max)}
                >
                  -
                </button>
                <span className="stepper__value">{formData[field.name]}</span>
                <button
                  type="button"
                  className="stepper__btn"
                  onClick={() => handleStepperChange(field.name, 1, field.min, field.max)}
                >
                  +
                </button>
              </div>
            ) : (
              <input
                type={field.type || 'text'}
                className="form-input"
                placeholder={field.placeholder || ''}
                value={formData[field.name]}
                onChange={(e) =>
                  handleChange(
                    field.name,
                    field.type === 'number' ? Number(e.target.value) || 0 : e.target.value
                  )
                }
              />
            )}

            {errors[field.name] && <div className="form-error">{errors[field.name]}</div>}
          </div>
        ))}

        <div className="wizard__actions">
          {currentStep > 0 ? (
            <button type="button" className="btn btn--secondary" onClick={handleBack}>
              {t('action.back')}
            </button>
          ) : (
            onCancel && (
              <button type="button" className="btn btn--secondary" onClick={onCancel}>
                {t('action.cancel')}
              </button>
            )
          )}

          {currentStep < steps.length - 1 ? (
            <button type="button" className="btn btn--primary" onClick={handleNext}>
              {t('action.next')}
            </button>
          ) : (
            <button type="submit" className="btn btn--primary">
              {submitLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default WizardForm
