# LifeLog deployment

## Supabase

1. Apply every file in `supabase/migrations` in timestamp order.
2. Copy the project URL and publishable key into the matching public environment variables.
3. Keep the service-role key server-only.
4. Set the production URL under Authentication → URL Configuration and retain `http://localhost:3000/**` for development.

## Web push

Run `npm run vapid` once. Store the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key as `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to an administrator email URI such as `mailto:admin@example.com`.

Configure Supabase Cron to call `GET https://YOUR_APP/api/reminders` every 15 minutes with `Authorization: Bearer YOUR_CRON_SECRET`. Store the same random value as the deployment's `CRON_SECRET`.

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
