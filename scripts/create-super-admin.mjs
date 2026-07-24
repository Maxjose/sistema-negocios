import { createClient } from "@supabase/supabase-js";

const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "INITIAL_ADMIN_EMAIL",
  "INITIAL_ADMIN_NAME",
  "INITIAL_ADMIN_PASSWORD",
];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVariables.join(", ")}`,
  );
  process.exit(1);
}

if (process.env.INITIAL_ADMIN_PASSWORD.length < 12) {
  console.error("INITIAL_ADMIN_PASSWORD must contain at least 12 characters.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const email = process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
const fullName = process.env.INITIAL_ADMIN_NAME.trim();

const { data: usersData, error: listError } =
  await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

if (listError) {
  console.error(`Unable to inspect Auth users: ${listError.message}`);
  process.exit(1);
}

let user = usersData.users.find(
  (candidate) => candidate.email?.toLowerCase() === email,
);
let createdUser = false;

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: process.env.INITIAL_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    console.error(`Unable to create Auth user: ${error?.message}`);
    process.exit(1);
  }

  user = data.user;
  createdUser = true;
}

const { error: profileError } = await supabase.from("profiles").upsert(
  {
    id: user.id,
    business_id: null,
    full_name: fullName,
    role: "super_admin",
    status: "active",
    must_change_password: false,
  },
  { onConflict: "id" },
);

if (profileError) {
  if (createdUser) {
    await supabase.auth.admin.deleteUser(user.id);
  }
  console.error(`Unable to create admin profile: ${profileError.message}`);
  process.exit(1);
}

console.log(
  createdUser
    ? `Super administrator created for ${email}.`
    : `Super administrator profile synchronized for ${email}.`,
);
