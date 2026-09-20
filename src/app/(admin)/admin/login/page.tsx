import { LoginForm } from "@/components/admin/LoginForm";
import { getStoreInfoSettings } from "@/server/settings";

export default async function AdminLoginPage() {
  const storeInfo = await getStoreInfoSettings();
  return <LoginForm storeInfo={storeInfo} />;
}
