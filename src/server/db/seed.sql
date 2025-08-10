-- Insert into user table
INSERT OR IGNORE INTO user (id, name, email, email_verified, image, created_at, updated_at)
VALUES 
('Fe7gvakGA5tVO5Ulho1BIqVGpMBan8r5', 'Pedro Pascal', 'pedro.pascal@gmail.com', 1, '/notion-avatars/avatar-08.svg', unixepoch('now') * 1000, unixepoch('now') * 1000),
('Ks9mPqR4Nt2Wx5Yz8Abc3Def7Ghi1JkL', 'Sarah Johnson', 'sarah.johnson@gmail.com', 1, '/notion-avatars/avatar-02.svg', unixepoch('now') * 1000, unixepoch('now') * 1000),
('Lm4nQpR8St2Uv5Wx7Yza3Bcd6Efg9HiJ', 'Michael Chen', 'michael.chen@gmail.com', 1, '/notion-avatars/avatar-03.svg', unixepoch('now') * 1000, unixepoch('now') * 1000);

-- Insert into account table
INSERT OR IGNORE INTO account (id, user_id, account_id, provider_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, scope, id_token, password, created_at, updated_at)
VALUES 
('account_Fe7gvakGA5tVO5Ulho1BIqVGpMBan8r5', 'Fe7gvakGA5tVO5Ulho1BIqVGpMBan8r5', 'Fe7gvakGA5tVO5Ulho1BIqVGpMBan8r5', 'credential', NULL, NULL, NULL, NULL, NULL, NULL, '20a5f24e5bd045ef0d039df14b8b7089:86f8b272107169850cbd07a6d8413f222c9ebfa3a6ec23de1254cde97e875becfb183d378b801a3ed21a618c32afcc1dd5c095d600928574ea42620962ed7738', unixepoch('now') * 1000, unixepoch('now') * 1000),
('account_Ks9mPqR4Nt2Wx5Yz8Abc3Def7Ghi1JkL', 'Ks9mPqR4Nt2Wx5Yz8Abc3Def7Ghi1JkL', 'Ks9mPqR4Nt2Wx5Yz8Abc3Def7Ghi1JkL', 'credential', NULL, NULL, NULL, NULL, NULL, NULL, '20a5f24e5bd045ef0d039df14b8b7089:86f8b272107169850cbd07a6d8413f222c9ebfa3a6ec23de1254cde97e875becfb183d378b801a3ed21a618c32afcc1dd5c095d600928574ea42620962ed7738', unixepoch('now') * 1000, unixepoch('now') * 1000),
('account_Lm4nQpR8St2Uv5Wx7Yza3Bcd6Efg9HiJ', 'Lm4nQpR8St2Uv5Wx7Yza3Bcd6Efg9HiJ', 'Lm4nQpR8St2Uv5Wx7Yza3Bcd6Efg9HiJ', 'credential', NULL, NULL, NULL, NULL, NULL, NULL, '20a5f24e5bd045ef0d039df14b8b7089:86f8b272107169850cbd07a6d8413f222c9ebfa3a6ec23de1254cde97e875becfb183d378b801a3ed21a618c32afcc1dd5c095d600928574ea42620962ed7738', unixepoch('now') * 1000, unixepoch('now') * 1000);

-- Insert into organization table
INSERT OR IGNORE INTO organization (id, name, slug, logo, metadata, created_at)
VALUES ('bu1cEXJI1PLWqnU7nQyvmDTEaEiqE9oR', 'Alwurts', 'alwurts', NULL, NULL, unixepoch('now') * 1000);

-- Insert into org_member table
INSERT OR IGNORE INTO organization_member (id, user_id, organization_id, role, created_at)
VALUES 
('member_Fe7gvakGA5tVO5Ulho1BIqVGpMBan8r5', 'Fe7gvakGA5tVO5Ulho1BIqVGpMBan8r5', 'bu1cEXJI1PLWqnU7nQyvmDTEaEiqE9oR', 'owner', unixepoch('now') * 1000),
('member_Ks9mPqR4Nt2Wx5Yz8Abc3Def7Ghi1JkL', 'Ks9mPqR4Nt2Wx5Yz8Abc3Def7Ghi1JkL', 'bu1cEXJI1PLWqnU7nQyvmDTEaEiqE9oR', 'member', unixepoch('now') * 1000),
('member_Lm4nQpR8St2Uv5Wx7Yza3Bcd6Efg9HiJ', 'Lm4nQpR8St2Uv5Wx7Yza3Bcd6Efg9HiJ', 'bu1cEXJI1PLWqnU7nQyvmDTEaEiqE9oR', 'member', unixepoch('now') * 1000);