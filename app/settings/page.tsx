import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDemoUser } from "@/services/userService";

export default async function SettingsPage() {
  const user = await getDemoUser();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Paramètres"
        description="Profil local prévu pour une future synchronisation multi-utilisateur."
      />
      <Card>
        <CardBody className="grid gap-2 text-sm">
          <p>
            <span className="font-medium">Nom :</span> {user.name}
          </p>
          <p>
            <span className="font-medium">Email :</span> {user.email}
          </p>
          <p className="text-[#6d6257]">
            Les préférences culinaires sont structurées en base pour les futures
            recommandations personnalisées.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
