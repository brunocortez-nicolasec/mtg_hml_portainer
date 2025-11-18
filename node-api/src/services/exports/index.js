// node-api/src/services/exports/index.js

import express from "express";
import passport from "passport";
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs'; // Importa o Excel
// ======================= INÍCIO DA ALTERAÇÃO =======================
import PdfPrinter from 'pdfmake'; // 1. Troca pdfkit por pdfmake
// ======================== FIM DA ALTERAÇÃO =========================

const prisma = new PrismaClient();
const router = express.Router();

// --- Helpers copiados dos seus "manuais" (metrics/divergences) ---
const cleanText = (text) => text?.trim().toLowerCase();
const cleanCpf = (cpf) => cpf?.replace(/[^\d]/g, '');

const checkAttributeMatch = (operator, userValue, ruleValue) => {
  if (userValue === null || userValue === undefined || ruleValue === null || ruleValue === undefined) {
    return false;
  }
  const u = String(userValue).toLowerCase();
  const r = String(ruleValue).toLowerCase();
  
  switch (operator) {
    case 'equals':
      return u === r;
    case 'not_equals':
      return u !== r;
    case 'contains':
      return u.includes(r);
    case 'starts_with':
      return u.startsWith(r);
    case 'ends_with':
      return u.endsWith(r);
    default:
      return false;
  }
};


// --- Helper: Converte JSON para CSV ---
function convertToCSV(data) {
  if (data.length === 0) {
    return "";
  }
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  const csvRows = [headerRow];
  for (const row of data) {
    const values = headers.map(header => escape(row[header]));
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

/**
 * Helper: Converte JSON para um Buffer XLSX
 */
async function convertToXLSX(data) {
  if (data.length === 0) {
    return null;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PortalNicolaSec';
  workbook.lastModifiedBy = 'PortalNicolaSec';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Exportacao');

  const headers = Object.keys(data[0]);
  worksheet.columns = headers.map(headerKey => ({
    header: headerKey, 
    key: headerKey,   
    width: 30,        
    style: { 
      font: { name: 'Arial', size: 10 },
      alignment: { vertical: 'middle', horizontal: 'left' }
    }
  }));

  worksheet.addRows(data);
  worksheet.getRow(1).font = { name: 'Arial', size: 11, bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  worksheet.views = [ { state: 'frozen', xSplit: 0, ySplit: 1 } ];
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}


// ======================= INÍCIO DA ALTERAÇÃO =======================
// 2. Define as fontes (Obrigatório para pdfmake no Node.js)
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};
const printer = new PdfPrinter(fonts);

/**
 * Helper: Converte JSON para um Buffer PDF (com pdfmake)
 * @param {Array<object>} data - O array de dados (flatData)
 * @returns {Promise<Buffer>} - O buffer do arquivo .pdf
 */
async function convertToPDF(data) {
  if (data.length === 0) {
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      const headers = Object.keys(data[0]);
      
      const headerRow = headers.map(h => ({ 
        text: h, 
        style: 'tableHeader' 
      }));

      const bodyRows = data.map(row => {
        return headers.map(header => {
          const val = row[header];
          return (val === null || val === undefined) ? 'N/A' : String(val);
        });
      });

      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape', 
        pageMargins: [ 20, 40, 20, 40 ], 
        
        content: [
          { text: 'Relatório de Exportação', style: 'header' },
          { text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`, style: 'subheader' },
          {
            style: 'tableMain',
            table: {
              headerRows: 1,
              widths: headers.map(h => (h.includes('id') || h.includes('status')) ? 'auto' : '*'),
              body: [
                headerRow, 
                ...bodyRows 
              ]
            },
            layout: 'lightHorizontalLines' 
          }
        ],

        styles: {
          header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
          subheader: { fontSize: 10, margin: [0, 0, 0, 10] },
          tableMain: { fontSize: 8, margin: [0, 5, 0, 15] }, 
          tableHeader: { bold: true, fontSize: 9, fillColor: '#D3D3D3' } 
        },
        defaultStyle: {
          font: 'Roboto' 
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const buffers = [];
      pdfDoc.on('data', buffers.push.bind(buffers));
      pdfDoc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(buffer); 
      });
      pdfDoc.on('error', reject);
      pdfDoc.end();

    } catch (error) {
      reject(error);
    }
  });
}
// ======================== FIM DA ALTERAÇÃO =========================


/**
 * @route   POST /exports
 * @desc    Gera e baixa um relatório (CSV ou XLSX) com base nos filtros
 * @access  Private
 */
const generateExport = async (req, res) => {
  // 1. Extrair os novos filtros do body
  const { reportType, systemId, advancedFilters, exportFormat } = req.body;
  const fileType = exportFormat || 'csv'; // Define 'csv' como padrão
  
  const filters = advancedFilters || {};
  const { 
    identityStatus, 
    accountStatus, 
    divergenceType, 
    perfil, 
    userType, 
    divergenceStatus 
  } = filters;
  
  const userId = parseInt(req.user.id, 10);

  if (!reportType) {
    return res.status(400).json({ message: "O 'Tipo de Relatório' é obrigatório." });
  }
  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  try {
    let data;
    let flatData;
    const systemIdInt = parseInt(systemId, 10);

    // 2. Pré-buscar Exceções e Regras de SoD (copiado do metrics/index.js)
    const accountExceptions = await prisma.accountDivergenceException.findMany({
        where: { userId: userId },
        select: { accountId: true, divergenceCode: true }
    });
    const accountExceptionsSet = new Set(
        accountExceptions.map(ex => `${ex.accountId}_${ex.divergenceCode}`)
    );

    const identityExceptions = await prisma.identityDivergenceException.findMany({
        where: { userId: userId, divergenceCode: 'ACCESS_NOT_GRANTED' },
        select: { identityId: true, targetSystem: true }
    });
    const identityExceptionsSet = new Set(
        identityExceptions.map(ex => `${ex.identityId}_ACCESS_NOT_GRANTED_${ex.targetSystem}`)
    );

    const allSodRules = await prisma.sodRule.findMany({
        where: { userId: userId }
    });
    const sodRulesBySystem = allSodRules.reduce((acc, rule) => {
        const key = rule.systemId || 'global'; 
        if (!acc[key]) acc[key] = [];
        acc[key].push(rule);
        return acc;
    }, {});
    const globalSodRules = sodRulesBySystem['global'] || [];


    switch (reportType) {
      // --- Caso 1: Relatório de Contas ---
      case 'contas': {
        // 3. Construir o 'where' básico com filtros simples
        const whereAccounts = {
          system: {
            dataSourcesConfigs: {
              some: {
                dataSource: { userId: userId }
              }
            }
          }
        };

        if (systemId && systemId !== "todos" && !isNaN(systemIdInt)) {
          whereAccounts.systemId = systemIdInt;
        }
        
        if ((identityStatus && identityStatus !== "todos") || (userType && userType.trim() !== "")) {
          whereAccounts.identity = { ...whereAccounts.identity };
          if (identityStatus && identityStatus !== "todos") {
            whereAccounts.identity.status_hr = identityStatus;
          }
          if (userType && userType.trim() !== "") {
            whereAccounts.identity.user_type_hr = { contains: userType, mode: 'insensitive' };
          }
        }

        if (accountStatus && accountStatus !== "todos") {
          whereAccounts.status_account = accountStatus;
        }

        if (perfil && perfil.trim() !== "") {
          whereAccounts.assignments = {
            some: {
              resource: {
                name_resource: { contains: perfil, mode: 'insensitive' }
              }
            }
          };
        }

        // 4. Buscar os dados base
        let accounts = await prisma.accounts.findMany({
          where: whereAccounts,
          include: {
            system: {
              select: { name_system: true, id: true }
            },
            identity: true, // Inclui a identidade completa
            assignments: { 
              include: {
                resource: true
              }
            }
          },
          orderBy: {
            system: { name_system: 'asc' }
          }
        });

        // 5. Aplicar filtros de Divergência (lógica do metrics/index.js)
        const divergenceStatusFilter = divergenceStatus || 'divergent_only';
        if ((divergenceType && divergenceType.code) || divergenceStatusFilter !== 'divergent_only') {
          
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          accounts = accounts.filter(account => {
            const rhEquivalent = account.identity;
            
            // Função para verificar SoD (copiada do metrics/index.js)
            const checkSodViolation = () => {
              const isExcepted = accountExceptionsSet.has(`${account.id}_SOD_VIOLATION`);
              const systemRules = sodRulesBySystem[account.systemId] || [];
              const applicableSodRules = [...globalSodRules, ...systemRules];
              if (applicableSodRules.length === 0) return { isDivergent: false, isExcepted };

              const accountResourceIds = new Set(account.assignments.map(a => a.resource.id));

              for (const rule of applicableSodRules) {
                if (rule.ruleType === 'ROLE_X_ROLE') {
                  const hasProfileA = accountResourceIds.has(parseInt(rule.valueAId, 10));
                  const hasProfileB = accountResourceIds.has(parseInt(rule.valueBId, 10));
                  if (hasProfileA && hasProfileB) return { isDivergent: true, isExcepted }; // Violação

                } else if (rule.ruleType === 'ATTR_X_ROLE') {
                  if (rhEquivalent) {
                    const hasProfileB = accountResourceIds.has(parseInt(rule.valueBId, 10));
                    const attributeValue = rhEquivalent[rule.valueAId]; 
                    const attributeMatches = checkAttributeMatch(
                      rule.valueAOperator,
                      attributeValue,
                      rule.valueAValue
                    );
                    if (attributeMatches && hasProfileB) return { isDivergent: true, isExcepted }; // Violação
                  }
                }
              }
              return { isDivergent: false, isExcepted }; // Nenhuma violação
            };

            // Função genérica para aplicar o filtro de status (divergent_only, exceptions_only, all)
            const applyDivergenceStatus = (checkResult) => {
              const { isDivergent, isExcepted } = checkResult;
              if (divergenceStatusFilter === 'exceptions_only') {
                return isDivergent && isExcepted;
              }
              if (divergenceStatusFilter === 'all') {
                return isDivergent;
              }
              // Padrão (divergent_only)
              return isDivergent && !isExcepted; 
            };


            // Switch para o tipo de divergência
            // Se nenhum tipo for selecionado, passamos para 'TODAS'
            const typeCode = (divergenceType && divergenceType.code) ? divergenceType.code : 'TODAS';

            switch (typeCode) {
              case 'ZOMBIE_ACCOUNT': {
                const isDivergent = rhEquivalent && account.status_account === 'Ativo' && rhEquivalent.status_hr === 'Inativo';
                const isExcepted = accountExceptionsSet.has(`${account.id}_ZOMBIE_ACCOUNT`);
                return applyDivergenceStatus({ isDivergent, isExcepted });
              }
              
              case 'ORPHAN_ACCOUNT': {
                const isDivergent = !rhEquivalent;
                const isExcepted = accountExceptionsSet.has(`${account.id}_ORPHAN_ACCOUNT`);
                return applyDivergenceStatus({ isDivergent, isExcepted });
              }
              
              case 'CPF_MISMATCH': {
                const isDivergent = rhEquivalent && account.cpf_account && rhEquivalent.cpf_hr && cleanCpf(account.cpf_account) !== cleanCpf(rhEquivalent.cpf_hr);
                const isExcepted = accountExceptionsSet.has(`${account.id}_CPF_MISMATCH`);
                return applyDivergenceStatus({ isDivergent, isExcepted });
              }
              
              case 'NAME_MISMATCH': {
                const isDivergent = rhEquivalent && account.name_account && rhEquivalent.name_hr && cleanText(account.name_account) !== cleanText(rhEquivalent.name_hr);
                const isExcepted = accountExceptionsSet.has(`${account.id}_NAME_MISMATCH`);
                return applyDivergenceStatus({ isDivergent, isExcepted });
              }
              
              case 'EMAIL_MISMATCH': {
                const isDivergent = rhEquivalent && account.email_account && rhEquivalent.email_hr && cleanText(account.email_account) !== cleanText(rhEquivalent.email_hr);
                const isExcepted = accountExceptionsSet.has(`${account.id}_EMAIL_MISMATCH`);
                return applyDivergenceStatus({ isDivergent, isExcepted });
              }

              case 'DORMANT_ADMIN': {
                const isAdmin = account.assignments.some(a => a.resource.name_resource.toLowerCase().includes('admin'));
                const loginDateStr = account.extra_data_account?.last_login;
                let isDivergent = false;
                if (isAdmin && account.status_account === 'Ativo' && loginDateStr) {
                  const loginDate = new Date(loginDateStr);
                  isDivergent = !isNaN(loginDate.getTime()) && loginDate < ninetyDaysAgo;
                }
                const isExcepted = accountExceptionsSet.has(`${account.id}_DORMANT_ADMIN`);
                return applyDivergenceStatus({ isDivergent, isExcepted });
              }
              
              case 'SOD_VIOLATION': {
                const sodResult = checkSodViolation(); // Já retorna { isDivergent, isExcepted }
                return applyDivergenceStatus(sodResult);
              }

              case 'TODAS': {
                // Checa *qualquer* divergência e aplica o status
                const checks = [
                  applyDivergenceStatus({
                    isDivergent: rhEquivalent && account.status_account === 'Ativo' && rhEquivalent.status_hr === 'Inativo',
                    isExcepted: accountExceptionsSet.has(`${account.id}_ZOMBIE_ACCOUNT`)
                  }),
                  applyDivergenceStatus({
                    isDivergent: !rhEquivalent,
                    isExcepted: accountExceptionsSet.has(`${account.id}_ORPHAN_ACCOUNT`)
                  }),
                  applyDivergenceStatus({
                    isDivergent: rhEquivalent && account.cpf_account && rhEquivalent.cpf_hr && cleanCpf(account.cpf_account) !== cleanCpf(rhEquivalent.cpf_hr),
                    isExcepted: accountExceptionsSet.has(`${account.id}_CPF_MISMATCH`)
                  }),
                  applyDivergenceStatus({
                    isDivergent: rhEquivalent && account.name_account && rhEquivalent.name_hr && cleanText(account.name_account) !== cleanText(rhEquivalent.name_hr),
                    isExcepted: accountExceptionsSet.has(`${account.id}_NAME_MISMATCH`)
                  }),
                  applyDivergenceStatus({
                    isDivergent: rhEquivalent && account.email_account && rhEquivalent.email_hr && cleanText(account.email_account) !== cleanText(rhEquivalent.email_hr),
                    isExcepted: accountExceptionsSet.has(`${account.id}_EMAIL_MISMATCH`)
                  }),
                  applyDivergenceStatus(checkSodViolation())
                  // (Adicionar DORMANT_ADMIN se necessário)
                ];
                
                // Retorna true se *alguma* das checagens (respeitando o divergenceStatus) for verdadeira
                return checks.some(result => result === true);
              }
              default:
                // Se o código de divergência não for reconhecido, não filtra (mantém a conta)
                // OU se o divergenceType for null e o divergenceStatus for 'divergent_only' (padrão)
                return true; 
            }
          });
        }
        
        data = accounts; // `data` agora é a lista filtrada

        // 6. Achatar os dados para um CSV limpo
        flatData = data.map(d => ({
          id_conta_portal: d.id,
          id_no_sistema: d.id_in_system_account,
          nome_conta: d.name_account,
          email_conta: d.email_account,
          cpf_conta: d.cpf_account,
          status_conta: d.status_account,
          sistema: d.system?.name_system || 'N/A',
          perfis: d.assignments.map(a => a.resource.name_resource).join('; ') || 'N/A',
          id_identidade_rh: d.identity?.identity_id_hr || 'N/A',
          nome_identidade_rh: d.identity?.name_hr || 'N/A',
          cpf_identidade_rh: d.identity?.cpf_hr || 'N/A',
          status_identidade_rh: d.identity?.status_hr || 'N/A', 
          tipo_usuario_rh: d.identity?.user_type_hr || 'N/A', 
        }));
        break;
      } // Fim do case 'contas'

      // --- Caso 2: Relatório de Identidades ---
      case 'identidades': {
        // 3. Construir o 'where' básico com filtros simples
        const whereIdentities = {
          dataSource: { userId: userId }
        };

        if (identityStatus && identityStatus !== "todos") {
          whereIdentities.status_hr = identityStatus;
        }

        if (userType && userType.trim() !== "") {
          whereIdentities.user_type_hr = { contains: userType, mode: 'insensitive' };
        }
        
        let identities = await prisma.identitiesHR.findMany({
          where: whereIdentities,
          orderBy: { name_hr: 'asc' }
        });

        // ======================= INÍCIO DA ALTERAÇÃO (CORREÇÃO DO FILTRO) =======================
        // 4. Aplicar filtros de Divergência ou filtros de Conta
        const divergenceStatusFilter = divergenceStatus || 'divergent_only';
        
        // Define se precisamos consultar a tabela de Contas
        const needsAccountLogic = (
          (divergenceType && divergenceType.code !== 'ACCESS_NOT_GRANTED') || // Pediu uma divergência de conta (Zumbi, CPF, etc.)
          (divergenceType?.code === 'TODAS') || // Pediu TODAS (que inclui as de conta)
          (accountStatus && accountStatus !== 'todos') || // Filtrou por status de conta
          (perfil && perfil.trim() !== '') // Filtrou por perfil
        );

        // Define se precisamos checar "Acesso Não Concedido"
        const needsAccessNotGrantedLogic = (
          (!divergenceType || divergenceType.code === 'ACCESS_NOT_GRANTED' || divergenceType.code === 'TODAS')
        );

        // Se qualquer filtro avançado de conta OU divergência for aplicado,
        // precisamos filtrar a lista de identidades.
        if (needsAccountLogic || needsAccessNotGrantedLogic || divergenceStatusFilter !== 'divergent_only') {
          
          const divergentIdentityIds = new Set();
          
          // LÓGICA A: Checa por "Acesso Não Concedido"
          if (needsAccessNotGrantedLogic) {
            const activeRhIdentities = identities.filter(rhId => rhId.status_hr === 'Ativo');
            const allAccounts = await prisma.accounts.findMany({
              where: { 
                identityId: { in: activeRhIdentities.map(i => i.id) },
                system: { dataSourcesConfigs: { some: { dataSource: { userId: userId } } } }
              },
              select: { identityId: true, systemId: true }
            });
            const accountsByIdentity = allAccounts.reduce((acc, account) => {
              if (!acc.has(account.identityId)) acc.set(account.identityId, new Set());
              acc.get(account.identityId).add(account.systemId);
              return acc;
            }, new Map());
            const allSystems = await prisma.system.findMany({
              where: { 
                dataSourcesConfigs: { some: { dataSource: { userId: userId } } },
                name_system: { not: 'RH' } 
              },
              select: { id: true, name_system: true } 
            });

            for (const sys of allSystems) {
              if (systemId && systemId !== "todos" && !isNaN(systemIdInt) && sys.id !== systemIdInt) {
                continue;
              }
              activeRhIdentities.forEach(rhIdentity => {
                const identitySystems = accountsByIdentity.get(rhIdentity.id);
                const hasAccountInSystem = identitySystems ? identitySystems.has(sys.id) : false;
                const isDivergent = !hasAccountInSystem;
                const isExcepted = identityExceptionsSet.has(`${rhIdentity.id}_ACCESS_NOT_GRANTED_${sys.name_system}`);

                let shouldAdd = false;
                if (divergenceStatusFilter === 'exceptions_only') {
                  shouldAdd = isDivergent && isExcepted;
                } else if (divergenceStatusFilter === 'all') {
                  shouldAdd = isDivergent;
                } else { // divergent_only
                  shouldAdd = isDivergent && !isExcepted;
                }
                if (shouldAdd) {
                  divergentIdentityIds.add(rhIdentity.id);
                }
              });
            }
          }

          // LÓGICA B: Checa por divergências baseadas em Contas (Zumbi, CPF, SoD, etc.)
          // OU por filtros de conta (Status, Perfil)
          if (needsAccountLogic) {
            
            const whereAccounts = {
              system: { dataSourcesConfigs: { some: { dataSource: { userId: userId } } } },
              identityId: { in: identities.map(i => i.id) } 
            };

            if (systemId && systemId !== "todos" && !isNaN(systemIdInt)) {
              whereAccounts.systemId = systemIdInt;
            }
            if (accountStatus && accountStatus !== "todos") {
              whereAccounts.status_account = accountStatus;
            }
            if (perfil && perfil.trim() !== "") {
               whereAccounts.assignments = { some: { resource: { name_resource: { contains: perfil, mode: 'insensitive' } } } };
            }

            let accounts = await prisma.accounts.findMany({
              where: whereAccounts,
              include: { identity: true, assignments: { include: { resource: true } }, system: { select: { id: true } } }
            });

            // Se um tipo de divergência foi especificado, filtra as contas
            if ((divergenceType && divergenceType.code) || divergenceStatusFilter !== 'divergent_only') {
              const ninetyDaysAgo = new Date();
              ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

              accounts = accounts.filter(account => {
                const rhEquivalent = account.identity;
                const checkSodViolation = () => { 
                  const isExcepted = accountExceptionsSet.has(`${account.id}_SOD_VIOLATION`);
                  const systemRules = sodRulesBySystem[account.systemId] || [];
                  const applicableSodRules = [...globalSodRules, ...systemRules];
                  if (applicableSodRules.length === 0) return { isDivergent: false, isExcepted };
                  const accountResourceIds = new Set(account.assignments.map(a => a.resource.id));
                  for (const rule of applicableSodRules) {
                    if (rule.ruleType === 'ROLE_X_ROLE') {
                      const hasProfileA = accountResourceIds.has(parseInt(rule.valueAId, 10));
                      const hasProfileB = accountResourceIds.has(parseInt(rule.valueBId, 10));
                      if (hasProfileA && hasProfileB) return { isDivergent: true, isExcepted };
                    } else if (rule.ruleType === 'ATTR_X_ROLE') {
                      if (rhEquivalent) {
                        const hasProfileB = accountResourceIds.has(parseInt(rule.valueBId, 10));
                        const attributeValue = rhEquivalent[rule.valueAId]; 
                        const attributeMatches = checkAttributeMatch(rule.valueAOperator, attributeValue, rule.valueAValue);
                        if (attributeMatches && hasProfileB) return { isDivergent: true, isExcepted };
                      }
                    }
                  }
                  return { isDivergent: false, isExcepted };
                };
                const applyDivergenceStatus = (checkResult) => {
                  const { isDivergent, isExcepted } = checkResult;
                  if (divergenceStatusFilter === 'exceptions_only') { return isDivergent && isExcepted; }
                  if (divergenceStatusFilter === 'all') { return isDivergent; }
                  return isDivergent && !isExcepted; 
                };
                
                // Se divergenceType for nulo, mas 'needsAccountLogic' for verdadeiro (por causa do perfil/status),
                // não devemos filtrar por 'TODAS' as divergências, mas sim manter a conta.
                // Apenas filtramos por divergência se 'divergenceType' for selecionado.
                const typeCode = (divergenceType && divergenceType.code) ? divergenceType.code : null;

                switch (typeCode) {
                  case 'ZOMBIE_ACCOUNT': { const isDivergent = rhEquivalent && account.status_account === 'Ativo' && rhEquivalent.status_hr === 'Inativo'; const isExcepted = accountExceptionsSet.has(`${account.id}_ZOMBIE_ACCOUNT`); return applyDivergenceStatus({ isDivergent, isExcepted }); }
                  case 'ORPHAN_ACCOUNT': { const isDivergent = !rhEquivalent; const isExcepted = accountExceptionsSet.has(`${account.id}_ORPHAN_ACCOUNT`); return applyDivergenceStatus({ isDivergent, isExcepted }); }
                  case 'CPF_MISMATCH': { const isDivergent = rhEquivalent && account.cpf_account && rhEquivalent.cpf_hr && cleanCpf(account.cpf_account) !== cleanCpf(rhEquivalent.cpf_hr); const isExcepted = accountExceptionsSet.has(`${account.id}_CPF_MISMATCH`); return applyDivergenceStatus({ isDivergent, isExcepted }); }
                  case 'NAME_MISMATCH': { const isDivergent = rhEquivalent && account.name_account && rhEquivalent.name_hr && cleanText(account.name_account) !== cleanText(rhEquivalent.name_hr); const isExcepted = accountExceptionsSet.has(`${account.id}_NAME_MISMATCH`); return applyDivergenceStatus({ isDivergent, isExcepted }); }
                  case 'EMAIL_MISMATCH': { const isDivergent = rhEquivalent && account.email_account && rhEquivalent.email_hr && cleanText(account.email_account) !== cleanText(rhEquivalent.email_hr); const isExcepted = accountExceptionsSet.has(`${account.id}_EMAIL_MISMATCH`); return applyDivergenceStatus({ isDivergent, isExcepted }); }
                  case 'DORMANT_ADMIN': { const isAdmin = account.assignments.some(a => a.resource.name_resource.toLowerCase().includes('admin')); const loginDateStr = account.extra_data_account?.last_login; let isDivergent = false; if (isAdmin && account.status_account === 'Ativo' && loginDateStr) { const loginDate = new Date(loginDateStr); isDivergent = !isNaN(loginDate.getTime()) && loginDate < ninetyDaysAgo; } const isExcepted = accountExceptionsSet.has(`${account.id}_DORMANT_ADMIN`); return applyDivergenceStatus({ isDivergent, isExcepted }); }
                  case 'SOD_VIOLATION': { const sodResult = checkSodViolation(); return applyDivergenceStatus(sodResult); }
                  case 'TODAS': {
                    const checks = [
                      applyDivergenceStatus({ isDivergent: rhEquivalent && account.status_account === 'Ativo' && rhEquivalent.status_hr === 'Inativo', isExcepted: accountExceptionsSet.has(`${account.id}_ZOMBIE_ACCOUNT`) }),
                      applyDivergenceStatus({ isDivergent: !rhEquivalent, isExcepted: accountExceptionsSet.has(`${account.id}_ORPHAN_ACCOUNT`) }),
                      applyDivergenceStatus({ isDivergent: rhEquivalent && account.cpf_account && rhEquivalent.cpf_hr && cleanCpf(account.cpf_account) !== cleanCpf(rhEquivalent.cpf_hr), isExcepted: accountExceptionsSet.has(`${account.id}_CPF_MISMATCH`) }),
                      applyDivergenceStatus({ isDivergent: rhEquivalent && account.name_account && rhEquivalent.name_hr && cleanText(account.name_account) !== cleanText(rhEquivalent.name_hr), isExcepted: accountExceptionsSet.has(`${account.id}_NAME_MISMATCH`) }),
                      applyDivergenceStatus({ isDivergent: rhEquivalent && account.email_account && rhEquivalent.email_hr && cleanText(account.email_account) !== cleanText(rhEquivalent.email_hr), isExcepted: accountExceptionsSet.has(`${account.id}_EMAIL_MISMATCH`) }),
                      applyDivergenceStatus(checkSodViolation())
                    ];
                    return checks.some(result => result === true);
                  }
                  // Se typeCode for null (veio aqui por causa do 'perfil' ou 'accountStatus'), não filtra por divergência
                  default: return true; 
                }
              });
            }
            
            // 4. Adiciona as identidades dessas contas ao Set
            for (const acc of accounts) {
              if (acc.identityId) {
                divergentIdentityIds.add(acc.identityId);
              }
            }
          }
        
          // 5. Filtrar a lista de identidades final
          // Se ambos os filtros (A e B) foram ativados, o SET conterá a união
          // Se apenas um foi ativado, o SET conterá apenas os IDs daquele filtro
          identities = identities.filter(id => divergentIdentityIds.has(id.id));
        }
        // ======================== FIM DA ALTERAÇÃO (CORREÇÃO DO FILTRO) =========================
        
        data = identities;
        
        flatData = data.map(d => ({
          id_identidade_portal: d.id,
          id_rh: d.identity_id_hr,
          nome_rh: d.name_hr,
          email_rh: d.email_hr,
          status_rh: d.status_hr,
          tipo_usuario_rh: d.user_type_hr,
          cpf_rh: d.cpf_hr,
          data_criacao: d.createdAt,
        }));
        break;
      } // Fim do case 'identidades'

// ======================= INÍCIO DA ALTERAÇÃO (CORREÇÃO DO SYNTAX ERROR) =======================
      // A chave '}' extra foi removida desta linha
      default:
        return res.status(400).json({ message: "Tipo de relatório desconhecido." });
    }
// ======================== FIM DA ALTERAÇÃO (CORREÇÃO DO SYNTAX ERROR) =========================

    if (flatData.length === 0) {
      return res.status(404).json({ message: "Nenhum dado encontrado para os filtros selecionados." });
    }

    // 3. Lógica de Geração de Arquivo (CSV, XLSX ou PDF)
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `export_${reportType}_${dateStr}.${fileType}`;
    
    if (fileType === 'xlsx') {
      // --- Gerar XLSX ---
      const buffer = await convertToXLSX(flatData);
      
      if (!buffer) {
        throw new Error("Não foi possível gerar o buffer do arquivo XLSX.");
      }
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(buffer);

    } else if (fileType === 'pdf') {
      // --- Gerar PDF ---
      const buffer = await convertToPDF(flatData);
      
      if (!buffer) {
        throw new Error("Não foi possível gerar o buffer do arquivo PDF.");
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(buffer);

    } else {
      // --- Gerar CSV (Padrão) ---
      const csvData = convertToCSV(flatData);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(csvData);
    }

  } catch (error) {
    console.error("Erro ao gerar exportação:", error);
    res.status(500).json({ message: error.message || "Erro interno do servidor." });
  }
};

// Definindo a rota (POST, pois recebe filtros no body)
router.post("/", passport.authenticate("jwt", { session: false }), generateExport);

export default router;