// src/layouts/administrar/grupos/data/membersListTableData.js

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import defaultAvatar from "assets/images/default-avatar.jpg";

function User({ image, name }) {
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

export default function data(members, onRemove) {
  const columns = [
    { Header: "usuário", accessor: "user", width: "70%", align: "left" },
    { Header: "ação", accessor: "action", align: "center" },
  ];

  // --- BLINDAGEM: (members || []) ---
  // Garante que não quebra se a lista vier vazia ou nula
  const rows = (members || []).map(member => ({
    user: <User image={member.profile_image} name={member.name} />,
    action: (
      <MDTypography
        onClick={() => onRemove(member.id)}
        component="a"
        href="#"
        variant="caption"
        color="error"
        fontWeight="medium"
      >
        Remover
      </MDTypography>
    ),
  }));

  return { columns, rows };
}