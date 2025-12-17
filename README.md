# Tushar Agrawal - Portfolio Website

A modern, dark-themed portfolio website built with Next.js 15 and Aceternity UI components featuring smooth animations and interactive elements.

## Features

- **Modern Design**: Dark theme with elegant animations
- **Aceternity UI Components**: Beautiful, animated UI components
- **Responsive**: Fully responsive design that works on all devices
- **Smooth Animations**: Powered by Framer Motion
- **TypeScript**: Type-safe code for better development experience
- **Optimized**: Built with Next.js for optimal performance

## Sections

1. **Hero Section**: Eye-catching introduction with animated spotlight and highlighted text
2. **About**: Professional summary and introduction
3. **Skills**: Interactive cards showcasing technical skills
4. **Experience**: Animated timeline of professional experience
5. **Projects**: Featured projects with hover effects
6. **Contact**: Links to social media and email

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
cd portfolio-website
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Customization

### Update Personal Information

Edit `app/page.tsx` to customize:

1. **Name and Title**: Update the hero section (lines 31-38)
2. **About Section**: Modify the about text (lines 50-56)
3. **Skills**: Edit the `skillsData` array (lines 137-168)
4. **Experience**: Update the `experienceData` array (lines 191-249)
5. **Projects**: Modify the `projectsData` array (lines 170-189)
6. **Contact Links**: Update email and social media links (lines 105-122)

### Change Colors

The color scheme uses Tailwind CSS. Main colors used:
- Primary: Indigo/Purple gradient
- Background: Black (#0a0a0a)
- Text: White/Neutral shades

Update colors in `app/globals.css` or component files.

## Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Aceternity UI**: Custom animated components

## Project Structure

```
portfolio-website/
├── app/
│   ├── globals.css       # Global styles and animations
│   ├── layout.tsx        # Root layout with metadata
│   └── page.tsx          # Main portfolio page
├── components/
│   └── ui/               # Aceternity UI components
│       ├── hero-highlight.tsx
│       ├── text-generate-effect.tsx
│       ├── card-hover-effect.tsx
│       ├── timeline.tsx
│       ├── moving-border.tsx
│       ├── spotlight.tsx
│       └── navbar.tsx
├── lib/
│   └── utils.ts          # Utility functions
└── public/               # Static assets
```

## Build for Production

```bash
npm run build
npm start
```

## Deploy

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Deploy with one click

### Other Platforms

This is a standard Next.js app and can be deployed to any platform that supports Node.js:
- Netlify
- AWS Amplify
- Railway
- Render

## Customization Tips

1. **Add More Sections**: Create new sections in `app/page.tsx`
2. **Add Blog**: Create a `/blog` route with separate page
3. **Add Resume Download**: Add a PDF file to `/public` and link to it
4. **Add Analytics**: Integrate Google Analytics or similar
5. **Add Contact Form**: Integrate with EmailJS or similar service

## License

This project is open source and available under the MIT License.

## Credits

- Built with [Next.js](https://nextjs.org/)
- UI Components inspired by [Aceternity UI](https://ui.aceternity.com/)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)

## Support

For issues or questions, please open an issue on GitHub or contact via email.
