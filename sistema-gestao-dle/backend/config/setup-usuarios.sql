-- =============================================
-- SCRIPT SQL - Tabela de usuários Sistema DLE
-- Executar no banco: acessos (qualquer servidor)
-- =============================================

-- Tabela de perfis de acesso
CREATE TABLE dle_perfis (
  id          INT PRIMARY KEY IDENTITY(1,1),
  nome        VARCHAR(50)  NOT NULL UNIQUE,  -- ex: 'admin', 'gestor', 'visualizador'
  descricao   VARCHAR(200) NOT NULL,
  criado_em   DATETIME DEFAULT GETDATE()
);

INSERT INTO dle_perfis (nome, descricao) VALUES
  ('admin',        'Acesso total ao sistema, incluindo controle de usuários'),
  ('gestor',       'Acesso a gestão, indicadores e cálculo DLE'),
  ('visualizador', 'Apenas visualização de dados e indicadores');

-- Tabela de usuários do sistema
CREATE TABLE dle_usuarios (
  id              INT PRIMARY KEY IDENTITY(1,1),
  login           VARCHAR(100) NOT NULL UNIQUE,  -- login AD (sAMAccountName)
  nome            VARCHAR(200) NOT NULL,          -- displayName do AD
  email           VARCHAR(200),                   -- mail do AD
  planta          VARCHAR(10)  NOT NULL,          -- MLB, MJN, MMB
  perfil_id       INT          NOT NULL REFERENCES dle_perfis(id),
  ativo           BIT          DEFAULT 1,
  reset_token     VARCHAR(200) NULL,              -- token para recuperação de senha
  reset_expira_em DATETIME     NULL,              -- expiração do token
  ultimo_acesso   DATETIME     NULL,
  criado_em       DATETIME     DEFAULT GETDATE(),
  atualizado_em   DATETIME     DEFAULT GETDATE()
);

-- Índices para performance
CREATE INDEX IX_dle_usuarios_login  ON dle_usuarios(login);
CREATE INDEX IX_dle_usuarios_planta ON dle_usuarios(planta);
CREATE INDEX IX_dle_usuarios_token  ON dle_usuarios(reset_token) WHERE reset_token IS NOT NULL;

-- Trigger para atualizar atualizado_em automaticamente
CREATE TRIGGER trg_dle_usuarios_update
ON dle_usuarios
AFTER UPDATE
AS
BEGIN
  UPDATE dle_usuarios
  SET atualizado_em = GETDATE()
  FROM dle_usuarios u
  INNER JOIN inserted i ON u.id = i.id;
END;

-- Usuário admin inicial (login deve corresponder ao seu login do AD)
-- Ajuste o 'jonave10' para o seu login real
INSERT INTO dle_usuarios (login, nome, email, planta, perfil_id)
SELECT 'jonave10', 'Veloso, Jonathan', 'jonathan.veloso@magna.global', 'MLB',
       (SELECT id FROM dle_perfis WHERE nome = 'admin');