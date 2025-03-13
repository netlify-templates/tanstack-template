import { useStore } from '@tanstack/react-store';
import { v4 as uuidv4 } from 'uuid';
import { actions, selectors, store, type Conversation } from './demo.store';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Message } from '../utils/demo.ai';
import { useEffect } from 'react';

// Original app hook that matches the interface expected by the app
export function useAppState() {
  const isLoading = useStore(store, s => selectors.getIsLoading(s));
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  
  return {
    conversations,
    currentConversationId,
    isLoading,
    
    // Actions
    setCurrentConversationId: actions.setCurrentConversationId,
    addConversation: actions.addConversation,
    deleteConversation: actions.deleteConversation,
    updateConversationTitle: actions.updateConversationTitle,
    addMessage: actions.addMessage,
    setLoading: actions.setLoading,
    
    // Selectors
    getCurrentConversation: selectors.getCurrentConversation,
    getActivePrompt: selectors.getActivePrompt,
  };
}

// New hook for Convex integration
export function useConversations() {
  // Get conversations from Convex
  const convexConversations = useQuery(api.conversations.list) || [];
  
  // Convert Convex conversations to local format
  useEffect(() => {
    if (convexConversations.length > 0) {
      const formattedConversations: Conversation[] = convexConversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        messages: conv.messages as Message[],
      }));
      
      actions.setConversations(formattedConversations);
    }
  }, [convexConversations]);
  
  // Local state for UI reactivity
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const currentConversation = useStore(store, s => selectors.getCurrentConversation(s));
  
  // Convex mutations
  const createConversation = useMutation(api.conversations.create);
  const updateTitle = useMutation(api.conversations.updateTitle);
  const deleteConversation = useMutation(api.conversations.remove);
  const addMessageToConversation = useMutation(api.conversations.addMessage);
  
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
      
      // Then create in Convex database
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
        return null;
      }
    },
    
    updateConversationTitle: async (id: string, title: string) => {
      // First update local state
      actions.updateConversationTitle(id, title);
      
      // Then update in Convex
      try {
        await updateTitle({ id: id as Id<'conversations'>, title });
      } catch (error) {
        console.error('Failed to update conversation title in Convex:', error);
      }
    },
    
    deleteConversation: async (id: string) => {
      // First update local state
      actions.deleteConversation(id);
      
      // Then delete from Convex
      try {
        await deleteConversation({ id: id as Id<'conversations'> });
      } catch (error) {
        console.error('Failed to delete conversation from Convex:', error);
      }
    },
    
    addMessage: async (conversationId: string, message: Message) => {
      // First update local state
      actions.addMessage(conversationId, message);
      
      // Then add to Convex
      try {
        await addMessageToConversation({
          conversationId: conversationId as Id<'conversations'>,
          message,
        });
      } catch (error) {
        console.error('Failed to add message to Convex:', error);
      }
    },
  };
}