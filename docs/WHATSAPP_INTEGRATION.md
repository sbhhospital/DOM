# WhatsApp Integration — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

### 1. Adapter Architecture
The application uses an adapter pattern (`src/services/notifications/whatsappAdapter.ts` and Supabase Edge Function) allowing connection to any HTTP-based WhatsApp Business API panel.

```
+---------------------+      JSON POST      +-------------------------------+
|  DOM Reminder Job   | ------------------> | WhatsApp Provider Adapter     |
+---------------------+                     +-------------------------------+
                                                           |
                                                           v
                                            +-------------------------------+
                                            | Hospital WhatsApp API Gateway |
                                            +-------------------------------+
```

### 2. Supported Operations
- `sendPersonalReminder(recipientPhone, leaderName, portalUrl)`: Dispatches the 10:00 AM initial portal link.
- `sendFollowUpReminder(recipientPhone, leaderName, portalUrl)`: Dispatches the 10:05 AM follow-up reminder.
- `sendGroupEscalation(groupId, unresolvedLeaderList)`: Posts the 10:20 AM summary to the executive leadership group.
- `processDeliveryWebhook(payload)`: Receives delivery callbacks (`SENT`, `DELIVERED`, `READ`, `FAILED`) to update `notification_logs`.

### 3. Verification & Mock Fallback
- Local and staging environments run with `VITE_ENABLE_DEV_MOCK=true` to simulate dispatch logs without firing live WhatsApp messages to hospital executives.
- When live credentials (`WHATSAPP_API_KEY`, `WHATSAPP_API_BASE_URL`) are provided, the adapter automatically routes to the production gateway.
