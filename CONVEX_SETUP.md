# Fixing Convex Integration Issues

If you're not seeing your conversation data in the Convex database, follow these steps to troubleshoot:

## 1. Verify Your Convex Setup

1. Make sure you've created a Convex account at [dashboard.convex.dev](https://dashboard.convex.dev)
2. Create a new project in the Convex dashboard
3. Get your deployment URL from the dashboard

## 2. Update Your Environment Variables

1. Edit your `.env` file (not `.env.example`) with your actual Convex URL:

```
VITE_CONVEX_URL=https://your-actual-project-id.convex.cloud
```

## 3. Initialize Convex in Your Project

Run these commands in your project directory:

```bash
# Navigate to your project
cd /tanstack-template

# Initialize Convex
npx convex dev --once --configure
```

This will:
- Ask for your Convex credentials
- Generate proper type files
- Initialize the project

## 4. Check the Convex Schema and Tables

Make sure your schema is properly deployed:

```bash
npx convex dev
```

## 5. Debugging Tips

1. Check browser console for errors related to Convex
2. Look for any missing environment variables
3. Verify that your Convex URL in .env is correct
4. Make sure you've pushed the schema with `npx convex dev`

## 6. Test Creating a Conversation

1. Restart your development server (`npm run dev`)
2. Create a new conversation
3. Check the browser console for logs
4. Check your Convex dashboard for data

## 7. Common Errors

- If you see `Error: Failed to fetch from Convex API`, your URL is likely incorrect
- If you see `Error: Unknown table 'conversations'`, your schema hasn't been deployed correctly
- If you see no errors but data isn't saving, check permissions in your Convex dashboard

If you're still having issues, you can use localStorage as a fallback by adding this code to `src/store/demo.store.ts`:

```javascript
// Load initial state from localStorage
const savedState = localStorage.getItem('chatState');
const initialState: State = savedState ? JSON.parse(savedState) : {
  prompts: [],
  conversations: [],
  currentConversationId: null,
  isLoading: false
};

export const store = new Store<State>(initialState);

// Save state to localStorage when it changes
store.subscribe((state) => {
  localStorage.setItem('chatState', JSON.stringify(state));
});
```