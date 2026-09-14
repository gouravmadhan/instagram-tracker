/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101018',
        panel: '#191924',
        panel2: '#1f1f2c',
        hair: '#2b2b3a',
        cream: '#F2F0EA',
        muted: '#8C8C9C',
        violet: '#7C6FFF',
        coral: '#FF6B6B',
        leaf: '#3DDC84',
        amber: '#F5B942',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
