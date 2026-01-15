# TechnoStoria 3D – Ambiente Virtual Web/VR

Este projeto faz parte de uma Iniciação Científica voltada à criação de um **ambiente virtual 3D acessível via web e compatível com VR**, destinado à exposição de um acervo histórico de componentes de Tecnologia da Informação (TI).

A aplicação utiliza **Three.js + Vite + TypeScript**, permitindo renderização 3D moderna, suporte a WebXR e fácil integração futura com ambientes de experimentação em rede (Kubernetes, métricas de QoE, etc.).

---

## Tecnologias Utilizadas

* **Vite** – Bundler e servidor de desenvolvimento rápido
* **TypeScript** – Tipagem estática e maior robustez
* **Three.js** – Renderização 3D em ambiente web
* **WebXR (futuro)** – Suporte a Realidade Virtual
* **Blender (externo)** – Modelagem e exportação de modelos 3D (`.glb`)

---

## Pré-requisitos

Antes de começar, é necessário ter instalado:

* **Node.js** (versão LTS recomendada)
* **npm** (vem junto com o Node)
* Um editor de código (VS Code recomendado)

Verifique se o Node está instalado:

```bash
node -v
npm -v
```

---

## Como Rodar o Projeto Localmente

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/technostoria-3d.git
cd technostoria-3d
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

O projeto ficará disponível em:

```
http://localhost:5173
```

---

## Estrutura do Projeto

```text
technostoria-3d/
├─ public/
│  └─ models/          # Modelos 3D (.glb) exportados do Blender
├─ src/
│  └─ main.ts          # Código principal Three.js
├─ index.html          # Container da aplicação
├─ tsconfig.json       # Configuração do TypeScript
├─ package.json        # Dependências e scripts
└─ README.md
```

---

## Como Adicionar Modelos 3D

1. Modele o objeto no **Blender**
2. Exporte como **glTF Binary (`.glb`)**
3. Coloque o arquivo em:

   ```
   public/models/
   ```
4. Carregue o modelo no código usando `GLTFLoader`:

```ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('/models/exemplo.glb', (gltf) => {
  scene.add(gltf.scene);
});
```

---

## Objetivo do Projeto

* Criar um **ambiente virtual 3D acessível via navegador**
* Permitir uso em **desktop e dispositivos VR**
* Servir como base para:

  * experimentos de comunicação em rede
  * análise de QoE
  * integração com clusters Kubernetes
  * colaboração entre universidades

---

## Próximos Passos (Roadmap)

* [ ] Organização do ambiente como museu virtual
* [ ] Inserção completa do acervo histórico
* [ ] Interações com objetos (informações, navegação)
* [ ] Ativação de WebXR (VR)
* [ ] Integração com ferramentas de monitoramento (Prometheus, Grafana, etc.)

---

## Observações

* O projeto **não usa React** neste estágio para manter simplicidade e controle total da renderização 3D.
* Toda a renderização ocorre no navegador, sem plugins.
* Compatível com publicação em ambientes acadêmicos e servidores institucionais.

---


