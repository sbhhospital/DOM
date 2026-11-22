# Audio Announcements for SBH DOM Portal

This directory holds custom audio recordings generated via ElevenLabs (or any voice provider) for automated meeting announcements.

## Supported Files:
1. `announcement-dom.mp3` - Daily Operations Standup (DOM) Announcement at 10:00 AM IST
2. `announcement-wom.mp3` - Weekly Operations Meeting (WOM) Announcement at 10:00 AM IST
3. `announcement-mom.mp3` - Monthly Strategic Review (MOM) Announcement at 10:00 AM IST

## How It Works:
- If these `.mp3` files exist in this folder, the dashboard will automatically play the studio-quality voice file when the meeting starts or when you click "Test 10:00 AM Announcement".
- If no custom MP3 file is placed here, the system automatically falls back to the native Indian English voice (`en-IN`) via the browser's Web Speech API.
