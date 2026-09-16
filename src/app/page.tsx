import { checkHasUsers } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const hasUsers = await checkHasUsers();
  
  if (!hasUsers) {
    redirect("/setup");
  } else {
    redirect("/login");
  }
}
