
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegistrationForm.css';

const passwordStrength = (password) => {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};


const RegistrationForm = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dob: '',
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTouched({ ...touched, [e.target.name]: true });
    setError('');
  };

  const strength = passwordStrength(form.password);
  const minStrength = 4; // Require at least 4/5

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (strength < minStrength) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.firstName + ' ' + form.lastName,
          email: form.email,
          password: form.password
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLoading(false);
        navigate('/');
      } else {
        setLoading(false);
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setLoading(false);
      setError('Server error');
    }
  };

  return (
    <form className="registration-form" onSubmit={handleSubmit}>
      <h2>Register</h2>
      <label>
        First Name
        <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
      </label>
      <label>
        Last Name
        <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
      </label>
      <label>
        Email
        <input type="email" name="email" value={form.email} onChange={handleChange} required />
      </label>
      <label>
        Password
        <input type="password" name="password" value={form.password} onChange={handleChange} required />
      </label>
      <PasswordStrengthMeter password={form.password} />
      {submitted && strength < minStrength && (
        <div className="error">Password does not meet minimum requirements.</div>
      )}
      {error && <div className="error">{error}</div>}
      <label>
        Date of Birth
        <input type="date" name="dob" value={form.dob} onChange={handleChange} required />
      </label>
      <button type="submit" disabled={strength < minStrength || loading}>{loading ? 'Registering...' : 'Register'}</button>
    </form>
  );
};

const PasswordStrengthMeter = ({ password }) => {
  const strength = passwordStrength(password);
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const minStrength = 4;
  return (
    <div className="password-strength-meter">
      <progress value={strength} max="5" />
      <span className={strength < minStrength ? 'weak' : 'strong'}>
        {strengthLabels[strength]}
      </span>
      <ul className="password-requirements">
        <li className={password.length >= 8 ? 'met' : ''}>At least 8 characters</li>
        <li className={/[A-Z]/.test(password) ? 'met' : ''}>Uppercase letter</li>
        <li className={/[a-z]/.test(password) ? 'met' : ''}>Lowercase letter</li>
        <li className={/[0-9]/.test(password) ? 'met' : ''}>Number</li>
        <li className={/[^A-Za-z0-9]/.test(password) ? 'met' : ''}>Special character</li>
      </ul>
    </div>
  );
};

export default RegistrationForm;
