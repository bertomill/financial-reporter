import Head from 'next/head';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Replace with your actual auth API endpoint
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      // Redirect to login page after successful registration
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Register | Financial Reporter</title>
        <meta name="description" content="Create a new account for Financial Reporter" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="min-h-screen flex flex-col">
        <header className="bg-dark-800 border-b border-dark-600 py-4">
          <div className="container mx-auto px-4">
            <Link href="/" className="text-2xl font-bold text-primary-400">
              Financial Reporter
            </Link>
          </div>
        </header>
        
        <div className="flex-grow flex items-center justify-center py-12 px-4">
          <div className="card max-w-md w-full">
            <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>
            
            {error && (
              <div className="bg-red-900/40 border border-red-800 text-red-300 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="fullName" className="block text-gray-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className="input w-full"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="input w-full"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-300 mb-2">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="input w-full"
                  value={formData.password}
                  onChange={handleChange}
                />
                <p className="text-gray-400 text-sm mt-1">Must be at least 6 characters</p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="input w-full"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              
              <button
                type="submit"
                className="button-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
              
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary-400 hover:text-primary-300">
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
      
      <footer className="bg-dark-900 py-6">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© {new Date().getFullYear()} Financial Reporter. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
} 