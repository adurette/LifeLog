# LifeLog deployment

## Supabase

1. Apply every file in `supabase/migrations` in timestamp order.
2. Copy the project URL and publishable key into the matching public environment variables.
3. Keep the service-role key server-only.
4. Set the production URL under Authentication → URL Configuration and retain `http://localhost:3000/**` for development.
5. Under Authentication → Email Templates → Magic Link, use a code-based template that includes `{{ .Token }}` (not `{{ .ConfirmationURL }}`). For example: `Your LifeLog sign-in code is {{ .Token }}`. This lets installed iOS/Android PWAs finish authentication without moving the session into the browser.

Keep Supabase's OTP request cooldown enabled. The app displays the 60-second resend wait and lets the user enter the code immediately.

## Web push

Run `npm run vapid` once. Store the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key as `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to an administrator email URI such as `mailto:admin@example.com`.

Configure Supabase Cron to call `GET https://YOUR_APP/api/reminders` every minute (`* * * * *`) with `Authorization: Bearer YOUR_CRON_SECRET` and a 5-second HTTP timeout. Store the same random value as the deployment's `CRON_SECRET`. The route acknowledges the request immediately and processes reminders after sending its response.

Required production variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`

## Private beta

Beta mode defaults off. Invite an address and enable the gate with:

```sql
insert into public.beta_invites (email) values ('person@example.com') on conflict (email) do nothing;
update public.app_settings set beta_mode = true where id = true;
```

Disable the gate with:

```sql
update public.app_settings set beta_mode = false where id = true;
```
