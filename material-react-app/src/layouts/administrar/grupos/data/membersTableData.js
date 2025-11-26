import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import MDAvatar from "components/MDAvatar";
import defaultAvatar from "assets/images/default-avatar.jpg";

function Author({ image, name }) {
  return (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDAvatar src={image || defaultAvatar} name={name} size="sm" />
      <MDBox ml={2} lineHeight={1}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {name}
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

export default function data(members) {
  const columns = [
    { Header: "usuário", accessor: "user", width: "45%", align: "left" },
    { Header: "email", accessor: "email", align: "left" },
    { Header: "função", accessor: "role", align: "center" },
  ];

  // --- BLINDAGEM: (members || []) ---
  // Garante que não quebra se a lista de membros vier vazia ou nula
  const rows = (members || []).map(member => ({
    user: <Author image={member.profile_image} name={member.name} />,
    email: <MDTypography variant="caption">{member.email}</MDTypography>,
    // Tratamento de objeto aninhado
    role: <MDTypography variant="caption">{member.profile?.name || "N/A"}</MDTypography>,
  }));

  return { columns, rows };
}