import express from "express";
import passport from "passport";
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.profile?.name === 'Admin') { 
    next();
  } else {
    res.status(403).json({ message: "Acesso negado. Apenas administradores." });
  }
};

// --- Função Auxiliar para Gerar Senha Temporária (SEGURA E COMPLIANT) ---
const generateTemporaryPassword = (length = 12) => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const special = "!@#$%^&*(),.?\":{}|<>";
    const all = lower + upper + numbers + special;

    // Garante pelo menos um de cada tipo obrigatório
    let password = "";
    password += lower.charAt(Math.floor(Math.random() * lower.length));
    password += upper.charAt(Math.floor(Math.random() * upper.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));

    // Preenche o resto aleatoriamente
    for (let i = password.length; i < length; i++) {
        password += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Embaralha a senha para que os caracteres obrigatórios não fiquem sempre no início
    return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Rota GET
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  isAdmin,
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: { profile: true, package: true }, 
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(users);
    } catch (error) {
      console.error("List Users Error:", error);
      res.status(500).json({ message: "Erro ao buscar usuários." });
    }
  }
);

// Rota POST (Criação de Usuário)
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  isAdmin,
  async (req, res) => {
    try {
      const { name, email, password, role, packageId } = req.body; 
      
      const profileObject = await prisma.profile.findUnique({ where: { name: role } });
      if (!profileObject) {
        return res.status(400).json({ message: `O perfil '${role}' não é válido.` });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está em uso." });
      }

      // Validação de Complexidade
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])(?=.{8,})/;
      if (!passwordRegex.test(password)) {
          return res.status(400).json({ 
              message: "A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial." 
          });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          profileId: profileObject.id, 
          packageId: packageId || null,
          mustChangePassword: false 
        },
        include: { profile: true, package: true }, 
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Create User Error:", error);
      res.status(500).json({ message: "Erro ao criar o usuário." });
    }
  }
);

// --- ROTA DE RESET DE SENHA (ADMIN) ---
router.post(
    "/:id/reset-password",
    passport.authenticate("jwt", { session: false }),
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });
  
        // 1. Gera senha temporária GARANTINDO complexidade
        const tempPassword = generateTemporaryPassword(12);
  
        // 2. Criptografa
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
  
        // 3. Salva no banco e ATIVA a flag de troca obrigatória
        await prisma.user.update({
          where: { id: userId },
          data: { 
              password: hashedPassword,
              mustChangePassword: true 
          }
        });
  
        // 4. Retorna a senha EM TEXTO PURO para o admin ver
        res.status(200).json({ 
            message: "Senha resetada com sucesso.",
            tempPassword: tempPassword 
        });
  
      } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Erro ao resetar a senha." });
      }
    }
);

// --- ROTA DE TROCA DE SENHA PELO PRÓPRIO USUÁRIO ---
router.post(
  "/change-password",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const userId = req.user.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "A nova senha deve ter no mínimo 8 caracteres." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])(?=.{8,})/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
            message: "A senha deve ter no mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial." 
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { 
                password: hashedPassword,
                mustChangePassword: false 
            }
        });

        res.status(200).json({ message: "Senha alterada com sucesso." });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: "Erro ao alterar a senha." });
    }
  }
);


// Rota PATCH (Edição por Admin)
router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res, next) => {
      const targetId = parseInt(req.params.id, 10);
      if (req.user.profile?.name === 'Admin' || req.user.id === targetId) {
          next();
      } else {
          res.status(403).json({ message: "Sem permissão para editar este usuário." });
      }
  },
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { name, email, role, packageId, password } = req.body; 
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido." });
      }
      
      const dataToUpdate = { name, email };

      if (password && password.trim() !== "") {
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])(?=.{8,})/;
          if (!passwordRegex.test(password)) {
              return res.status(400).json({ 
                  message: "A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial." 
              });
          }
          const hashedPassword = await bcrypt.hash(password, 10);
          dataToUpdate.password = hashedPassword;
          dataToUpdate.mustChangePassword = false; 
      }
      
      if (req.user.profile?.name === 'Admin') {
          if (role) {
            const roleNameToFind = typeof role === 'string' ? role : role.name;
            const profileObject = await prisma.profile.findUnique({ where: { name: roleNameToFind } });
            if (!profileObject) {
              return res.status(400).json({ message: `O perfil '${roleNameToFind}' não é válido.` });
            }
            dataToUpdate.profileId = profileObject.id; 
          }
          
          if (packageId !== undefined) {
            dataToUpdate.packageId = packageId === "" ? null : packageId;
          }
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        include: { profile: true, package: true }, 
      });
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Update User Error:", error);
      res.status(500).json({ message: "Erro ao atualizar o usuário." });
    }
  }
);

// Rota DELETE
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  isAdmin,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido." });
      }
      if (req.user.id === userId) {
        return res.status(400).json({ message: "Você não pode deletar sua própria conta." });
      }
      await prisma.user.delete({
        where: { id: userId },
      });
      res.status(200).json({ message: "Usuário deletado com sucesso." });
    } catch (error) {
      console.error("Delete User Error:", error);
      res.status(500).json({ message: "Erro ao deletar o usuário." });
    }
  }
);

export default router;