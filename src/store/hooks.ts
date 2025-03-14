import { useStore } from '@tanstack/react-store';
import { v4 as uuidv4 } from 'uuid';
import { actions, selectors, store, type Conversation } from './store';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Message } from '../utils/ai';
import { useEffect } from 'react';

// Check if Convex URL is provided
const isConvexAvailable = Boolean(import.meta.env.VITE_CONVEX_URL);

// Original app hook that matches the interface expected by the app
export function useAppState() {
  const isLoading = useStore(store, s => selectors.getIsLoading(s));
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const prompts = useStore(store, s => selectors.getPrompts(s));
  
  return {
    conversations,
    currentConversationId,
    isLoading,
    prompts,
    
    // Actions
    setCurrentConversationId: actions.setCurrentConversationId,
    addConversation: actions.addConversation,
    deleteConversation: actions.deleteConversation,
    updateConversationTitle: actions.updateConversationTitle,
    addMessage: actions.addMessage,
    setLoading: actions.setLoading,
    createPrompt: actions.createPrompt,
    deletePrompt: actions.deletePrompt,
    setPromptActive: actions.setPromptActive,
    
    // Selectors
    getCurrentConversation: selectors.getCurrentConversation,
    getActivePrompt: selectors.getActivePrompt,
  };
}

// Hook for Convex integration with fallback to local state
export function useConversations() {
  // Local state for UI reactivity
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const currentConversation = useStore(store, s => selectors.getCurrentConversation(s));
  
  // Only use Convex if it's available
  const convexConversations = isConvexAvailable 
    ? useQuery(api.conversations.list) || []
    : null;
  
  // Convex mutations (only if Convex is available)
  const createConversation = isConvexAvailable ? useMutation(api.conversations.create) : null;
  const updateTitle = isConvexAvailable ? useMutation(api.conversations.updateTitle) : null;
  const deleteConversation = isConvexAvailable ? useMutation(api.conversations.remove) : null;
  const addMessageToConversation = isConvexAvailable ? useMutation(api.conversations.addMessage) : null;
  
  // Convert Convex conversations to local format if available
  useEffect(() => {
    if (isConvexAvailable && convexConversations && convexConversations.length > 0) {
      const formattedConversations: Conversation[] = convexConversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        messages: conv.messages as Message[],
      }));
      
      actions.setConversations(formattedConversations);
    }
  }, [convexConversations]);
  
  return {
    conversations,
    currentConversationId,
    currentConversation,
    
    setCurrentConversationId: (id: string | null) => {
      actions.setCurrentConversationId(id);
    },
    
    createNewConversation: async (title: string = 'New Conversation') => {
      const id = uuidv4();
      const newConversation: Conversation = {
        id,
        title,
        messages: [],
      };
      
      // First update local state for immediate UI feedback
      actions.addConversation(newConversation);
      
      // Then create in Convex database if available
      if (isConvexAvailable && createConversation) {
        try {
          const convexId = await createConversation({
            title,
            messages: [],
          });
          
          // Update the local conversation with the Convex ID
          actions.updateConversationId(id, convexId);
          actions.setCurrentConversationId(convexId);
          
          return convexId;
        } catch (error) {
          console.error('Failed to create conversation in Convex:', error);
        }
      }
      
      // If Convex is not available or there was an error, just use the local ID
      actions.setCurrentConversationId(id);
      return id;
    },
    
    updateConversationTitle: async (id: string, title: string) => {
      // First update local state
      actions.updateConversationTitle(id, title);
      
      // Then update in Convex if available
      if (isConvexAvailable && updateTitle) {
        try {
          await updateTitle({ id: id as Id<'conversations'>, title });
        } catch (error) {
          console.error('Failed to update conversation title in Convex:', error);
        }
      }
    },
    
    deleteConversation: async (id: string) => {
      // First update local state
      actions.deleteConversation(id);
      
      // Then delete from Convex if available
      if (isConvexAvailable && deleteConversation) {
        try {
          await deleteConversation({ id: id as Id<'conversations'> });
        } catch (error) {
          console.error('Failed to delete conversation from Convex:', error);
        }
      }
    },
    
    addMessage: async (conversationId: string, message: Message) => {
      // First update local state
      actions.addMessage(conversationId, message);
      
      // Then add to Convex if available
      if (isConvexAvailable && addMessageToConversation) {
        try {
          await addMessageToConversation({
            conversationId: conversationId as Id<'conversations'>,
            message,
          });
        } catch (error) {
          console.error('Failed to add message to Convex:', error);
        }
      }
    },
  };
} 