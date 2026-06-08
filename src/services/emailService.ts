/**
 * Service to handle sending emails through the Resend backend integration.
 * This keeps the API keys completely secure on the server side.
 */
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const emailService = {
  /**
   * Sends an email via the Resend API backend endpoint.
   * @param payload Email components (to, subject, html body, and optional custom sender)
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || `Server responded with status ${response.status}`,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error: any) {
      console.error('[emailService] Failed to send email via backend API:', error);
      return {
        success: false,
        error: error.message || 'Network error while calling email endpoint',
      };
    }
  }
};
