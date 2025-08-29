import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import fastApiClient from '@/lib/fastapi-client';

export interface UploadLog {
  id: string;
  upload_session_id: string;
  vendor_name: string | null;
  vendor_code: string | null;
  error_type: string;
  error_details: string | null;
  raw_data: any;
  created_at: string;
  created_by: string | null;
}

export const useUploadLogs = () => {
  return useQuery({
    queryKey: ['upload-logs'],
    queryFn: async () => {
      try {
        // For now, return empty array since upload logs aren't implemented in FastAPI yet
        // This can be implemented later when the backend supports upload logging
        return [] as UploadLog[];
      } catch (error) {
        console.error('Error fetching upload logs:', error);
        return [] as UploadLog[];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useClearUploadLogs = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      try {
        // For now, just simulate clearing logs
        // This can be implemented later when the backend supports upload logging
        return Promise.resolve();
      } catch (error) {
        console.error('Error clearing upload logs:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-logs'] });
    },
  });
};