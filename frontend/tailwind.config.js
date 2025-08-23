/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme base colors
        dark: {
          900: '#0a0a0b', // Deep black background
          800: '#1a1a1b', // Primary dark background
          700: '#262626', // Secondary background
          600: '#333333', // Card backgrounds
          500: '#404040', // Border colors
          400: '#525252', // Subtle borders
          300: '#737373', // Disabled text
          200: '#a3a3a3', // Secondary text
          100: '#d4d4d4', // Primary text (light)
          50: '#f5f5f5',  // Brightest text
        },
        // ElysAI brand colors based on logo gradient (#c00e9d to #2929a6)
        elysPink: {
          50: '#fdf2f8',
          100: '#fce7f3', 
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#e879b9', // Mid-tone
          600: '#c00e9d', // Primary logo color
          700: '#a50d85',
          800: '#8a0c6e',
          900: '#6f0a58',
        },
        // Deep blue-purple from logo
        elysBlue: {
          50: '#f0f0ff',
          100: '#e0e7ff',
          200: '#c7d2fe', 
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#2929a6', // Primary logo color
          900: '#1e1b8f',
        },
        // Gradient purple (between pink and blue)
        elysViolet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Mid gradient
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Updated primary (ElysAI pink)
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3', 
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#c00e9d', // Primary brand color
          600: '#a50d85',
          700: '#8a0c6e',
          800: '#6f0a58',
          900: '#5c0a47',
        },
        // Success colors (darker for dark theme)
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} 