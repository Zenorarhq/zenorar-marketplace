'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { ticketsApi } from '@/lib/api/tickets'

export default function ProductRequestPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    requestType: 'new-product',
    title: '',
    description: '',
    budget: 'not-sure',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ticketNumber, setTicketNumber] = useState('')
  const [submitError, setSubmitError] = useState('')

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    const requestTypeLabels: Record<string, string> = {
      'new-product': 'New Product',
      'custom-design': 'Custom Design',
      'specific-service': 'Specific Service',
      'other': 'Other',
    }
    const budgetLabels: Record<string, string> = {
      'under-50': 'Under $50',
      '50-200': '$50–$200',
      '200-500': '$200–$500',
      '500-plus': '$500+',
      'not-sure': 'Not Sure',
    }

    const fullDescription =
      `Request Type: ${requestTypeLabels[formData.requestType] || formData.requestType}\n` +
      `Budget Range: ${budgetLabels[formData.budget] || formData.budget}\n\n` +
      formData.description

    try {
      const result = await ticketsApi.create({
        subject: formData.title,
        description: fullDescription,
        category: 'PRODUCT',
        guestEmail: formData.email,
        guestName: formData.name,
      })
      if (result.success && result.data) {
        setTicketNumber(result.data.ticketNumber)
        setSubmitted(true)
      } else {
        setSubmitError(result.error || 'Failed to submit. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting product request:', error)
      setSubmitError('Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 py-12">
        <Breadcrumbs className="mb-6" />

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-white mb-4">Product Request</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Looking for something specific? Tell us what you need — a product, custom design, or any service — and we&apos;ll do our best to make it happen.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Info Cards */}
          <div className="space-y-6">
            <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                <Icon name="package-01" size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">New Products</h3>
              <p className="text-slate-400 text-sm">
                Request a product that isn&apos;t in our catalog yet. We source and add new items regularly.
              </p>
            </div>

            <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                <Icon name="paint-board" size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Custom Designs</h3>
              <p className="text-slate-400 text-sm">
                Need something built to your specifications? Share your design or concept and we&apos;ll discuss.
              </p>
            </div>

            <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                <Icon name="customer-service-01" size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Any Service</h3>
              <p className="text-slate-400 text-sm">
                Have a unique requirement? Describe it and our team will reach out with options.
              </p>
            </div>
          </div>

          {/* Request Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-surface-dark border border-border-dark rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="checkmark-circle-02" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Request Received!</h2>
                {ticketNumber && (
                  <p className="text-primary font-mono text-lg font-bold mb-4">{ticketNumber}</p>
                )}
                <p className="text-slate-400 mb-8">
                  Thank you for your request. Our team will review it and get back to you within 24 hours.
                  {ticketNumber && ' Save your ticket number to track your request.'}
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setTicketNumber('')
                    setSubmitError('')
                    setFormData({
                      name: '',
                      email: '',
                      requestType: 'new-product',
                      title: '',
                      description: '',
                      budget: 'not-sure',
                    })
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-surface-dark border border-border-dark rounded-2xl p-8"
              >
                <h2 className="text-xl font-bold text-white mb-6">Tell us what you need</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-slate-400 mb-2">
                      Your Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-400 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="requestType" className="block text-sm font-bold text-slate-400 mb-2">
                      Request Type
                    </label>
                    <select
                      id="requestType"
                      name="requestType"
                      value={formData.requestType}
                      onChange={handleInputChange}
                      className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    >
                      <option value="new-product">New Product</option>
                      <option value="custom-design">Custom Design</option>
                      <option value="specific-service">Specific Service</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="budget" className="block text-sm font-bold text-slate-400 mb-2">
                      Budget Range (optional)
                    </label>
                    <select
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    >
                      <option value="not-sure">Not Sure</option>
                      <option value="under-50">Under $50</option>
                      <option value="50-200">$50 – $200</option>
                      <option value="200-500">$200 – $500</option>
                      <option value="500-plus">$500+</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="title" className="block text-sm font-bold text-slate-400 mb-2">
                    Request Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g. Custom logo design, Specific script, iPhone 15 case..."
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-bold text-slate-400 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                    placeholder="Describe what you need in as much detail as possible — specifications, colors, size, quantity, links to references, etc."
                  />
                </div>

                {submitError && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Icon name="sent" size={20} />
                      Submit Request
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
