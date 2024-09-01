# Voice Notes AI

Voice Notes AI is a web application that allows users to record voice notes, transcribe them using Groq's Whisper API, and interact with an AI assistant based on the transcriptions. The app uses OpenAI's GPT-4 Mini model for generating responses, stores conversation data in a PostgreSQL database, and saves audio files in an Amazon S3 bucket.

## Features

- Voice recording and playback
- Audio transcription using Groq's Whisper API
- Real-time chat interface with an AI assistant based on transcriptions
- Persistent chat history stored in a database
- Audio file storage in Amazon S3

## Environment Variables

Before running the application, make sure to set up the following environment variables in your `.env` file:

- `DATABASE_URL`: Your PostgreSQL database connection string
- `OPENAI_API_KEY`: Your OpenAI API key for accessing the GPT-4 Mini model
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `AWS_REGION`: The AWS region where your S3 bucket is located (e.g., "us-east-2")
- `GROQ_API_KEY`: Your Groq API key for accessing the Whisper API

## Setting up Amazon S3

1. Create an AWS account if you don't have one.
2. Go to the AWS Management Console and navigate to the S3 service.
3. Click "Create bucket" and follow the prompts to create a new bucket for storing audio files.
4. Note down the bucket name and region.
5. Go to the IAM service and create a new user with programmatic access.
6. Attach the "AmazonS3FullAccess" policy to this user (or create a custom policy with more restricted permissions if needed).
7. After creating the user, you'll receive an Access Key ID and Secret Access Key. Use these in your environment variables.

Make sure to configure your S3 bucket's CORS settings to allow access from your application's domain.

## Setting up Groq API

1. Sign up for a Groq account at https://console.groq.com/
2. Navigate to the API Keys section and create a new API key.
3. Copy the API key and add it to your `.env` file as `GROQ_API_KEY`.

## Setting up OpenAI API

1. Go to https://platform.openai.com/ and sign up for an account if you don't have one.
2. Once logged in, navigate to the API keys section in your account dashboard.
3. Click on "Create new secret key" to generate a new API key.
4. Copy the generated API key immediately (you won't be able to see it again).
5. Add the API key to your `.env` file as `OPENAI_API_KEY`.

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Set up your `.env` file with the required environment variables
4. Run database migrations: `npx prisma migrate dev`
5. Start the development server: `npm run dev`

Visit `http://localhost:3000` in your browser to use the application.

## Technologies Used

- Next.js 14 with server actions
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL (Neon Serverless Postgres)
- OpenAI API
- Amazon S3
- Web Audio API
- Groq Whisper API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
