# 📖 Documentação — Jogo 3D Interativo

> **Arquivo:** `Jogo.ts`  
> **Motor:** Three.js + TypeScript  
> **Última atualização:** 2025

---

## Índice
1. [Visão Geral](#visão-geral)
2. [Como Jogar](#como-jogar)
3. [Arquitetura da Classe](#arquitetura-da-classe)
4. [Variáveis e Propriedades](#variáveis-e-propriedades)
5. [Métodos — Referência Completa](#métodos--referência-completa)
6. [Sistema de Física](#sistema-de-física)
7. [Sistema de HUD](#sistema-de-hud)
8. [Configuração do Modelo 3D](#configuração-do-modelo-3d)
9. [Como Adicionar Novos Objetos Interativos](#como-adicionar-novos-objetos-interativos)
10. [Ajuste Fino dos Parâmetros](#ajuste-fino-dos-parâmetros)

---

## Visão Geral

O jogo é uma aplicação Three.js de primeira pessoa com dois modos de interação distintos para objetos 3D. O cenário é carregado a partir de um arquivo `.glb` e qualquer mesh cujo nome contenha `"calculadora"` se torna automaticamente interativa.

```
┌─────────────────────────────────────────────────────┐
│                    class Jogo                        │
│                                                      │
│  Cena 3D ──► Carrega GLB ──► Registra objetos       │
│                                                      │
│  Loop (animar):                                      │
│    ├─ Movimenta jogador (WASD)                       │
│    ├─ atualizarFisica(dt)                            │
│    │     ├─ Modo Livre:    pegar / arremessar        │
│    │     ├─ Modo Exibição: flutuar / girar           │
│    │     └─ Retorno:       lerp até a origem         │
│    └─ renderizador.render()                          │
└─────────────────────────────────────────────────────┘
```

---

## Como Jogar

| Tecla / Ação | Efeito |
|---|---|
| `W A S D` | Move o jogador |
| `Shift` (esquerdo) | Corre (dobra a velocidade) |
| `F` | **Alterna** entre Modo Livre ↔ Modo Exibição |
| `E` *(Modo Livre)* | **Pega** o objeto apontado |
| Soltar `E` *(Modo Livre)* | **Arremessa** o objeto |
| `E` *(Modo Exibição)* | **Exibe** o objeto (faz flutuar + abre painel) |
| `Botão direito` + arrastar *(Modo Exibição)* | **Gira** o objeto |
| `R` | **Devolve** o objeto ao lugar de origem |
| `Click` | Ativa o controle de câmera (Pointer Lock) |

---

## Arquitetura da Classe

```
Jogo
│
├── PROPRIEDADES
│   ├── Núcleo Three.js       (cena, camera, renderizador, controles, jogador)
│   ├── Raycasting            (raycaster, origemRaio)
│   ├── Estado do teclado     (teclas)
│   ├── Objetos interativos   (objetosInterativos, objetoSelecionado)
│   ├── Estado da interação   (estaSegurando, estaRetornando, velocidadeObjeto)
│   ├── Modo de interação     (modoAtual)
│   ├── Rotação manual        (rotacionandoObjeto, rotacaoX/Y, ultimoMouseX/Y)
│   ├── Animação de flutuação (tempoFlutuacao)
│   ├── HUD                   (painelInfo)
│   └── Constantes de física  (GRAVIDADE, FORCA_LANCAMENTO, NIVEL_CHAO, NIVEL_ABISMO)
│
└── MÉTODOS
    ├── constructor()              — monta tudo e inicia o loop
    ├── criarPainelInfo()          — cria o painel HTML de informações
    ├── exibirPainel(info)         — preenche e mostra o painel
    ├── ocultarPainel()            — esconde o painel
    ├── atualizarIndicadorModo()   — atualiza o HUD de modo (canto inferior)
    ├── inicializarLuzes()         — adiciona luzes à cena
    ├── carregarModelo()           — carrega o GLB e registra objetos
    ├── inicializarEventos()       — registra todos os event listeners
    ├── pegarObjeto()              — raycast + anexa objeto ao jogador
    ├── arremessarObjeto()         — solta com velocidade da câmera
    ├── ativarModoExibicao()       — coloca objeto em modo flutuante
    ├── devolverObjeto()           — inicia animação de retorno à origem
    ├── alternarModo()             — troca Livre ↔ Exibição
    ├── atualizarFisica(dt)        — física e posicionamento por frame
    └── animar()                   — loop principal (chamado todo frame)
```

---

## Variáveis e Propriedades

### Núcleo Three.js

| Variável | Tipo | Descrição |
|---|---|---|
| `cena` | `THREE.Scene` | Contém todos os objetos 3D do jogo |
| `camera` | `THREE.PerspectiveCamera` | Ponto de vista do jogador (FOV 70°) |
| `renderizador` | `THREE.WebGLRenderer` | Motor de renderização WebGL com suporte a VR |
| `controles` | `PointerLockControls` | Captura o mouse para mover a câmera em primeira pessoa |
| `jogador` | `THREE.Group` | Grupo que une câmera + física do jogador |

### Raycasting

| Variável | Tipo | Descrição |
|---|---|---|
| `raycaster` | `THREE.Raycaster` | Detecta qual mesh 3D está no centro da mira |
| `origemRaio` | `THREE.Vector2(0, 0)` | Ponto fixo no centro da tela — instanciado uma vez |

### Estado da Interação

| Variável | Tipo | Descrição |
|---|---|---|
| `objetosInterativos` | `THREE.Object3D[]` | Lista de meshes que podem ser interagidas |
| `objetoSelecionado` | `THREE.Mesh \| null` | A mesh atualmente em mãos ou em exibição |
| `estaSegurando` | `boolean` | `true` enquanto o jogador segura o objeto (Modo Livre) |
| `estaRetornando` | `boolean` | `true` enquanto o objeto está voltando à origem |
| `velocidadeObjeto` | `THREE.Vector3` | Velocidade 3D do objeto após arremesso |
| `modoAtual` | `'livre' \| 'exibicao'` | Modo de interação ativo no momento |

### Rotação Manual (Modo Exibição)

| Variável | Tipo | Descrição |
|---|---|---|
| `rotacionandoObjeto` | `boolean` | `true` enquanto o botão direito está pressionado |
| `rotacaoX` | `number` | Ângulo acumulado de inclinação vertical (pitch), em radianos |
| `rotacaoY` | `number` | Ângulo acumulado de rotação horizontal (yaw), em radianos |
| `ultimoMouseX` | `number` | Posição X do mouse no frame anterior (para calcular delta) |
| `ultimoMouseY` | `number` | Posição Y do mouse no frame anterior (para calcular delta) |

### Constantes de Física

| Constante | Valor | Descrição |
|---|---|---|
| `GRAVIDADE` | `-18.0` | Aceleração gravitacional (m/s²). Negativo = para baixo |
| `FORCA_LANCAMENTO` | `12` | Velocidade inicial ao arremessar (m/s) |
| `NIVEL_CHAO` | `-15.2` | Altura Y do chão — **ajuste conforme o seu cenário** |
| `NIVEL_ABISMO` | `-60` | Se o objeto cair abaixo disso, retorna imediatamente |

---

## Métodos — Referência Completa

### `constructor()`
Monta toda a aplicação na sequência:
1. Cria cena, câmera e renderizador
2. Habilita VR e sombras
3. Cria o grupo `jogador` com a câmera dentro
4. Cria o painel HUD
5. Chama `inicializarLuzes()`, `inicializarEventos()`, `carregarModelo()`
6. Inicia o loop com `setAnimationLoop`

---

### `criarPainelInfo(): HTMLDivElement`
Cria um `<div>` estilizado com CSS inline e o insere no `document.body`.  
O painel usa `backdrop-filter: blur` para um efeito de vidro fosco.  
**Retorna** o elemento criado para ser armazenado em `this.painelInfo`.

---

### `exibirPainel(info: InformacoesObjeto): void`
Preenche `this.painelInfo` com o HTML gerado a partir do objeto `info` e o torna visível (`display: flex`).

**Parâmetros do objeto `InformacoesObjeto`:**
```typescript
interface InformacoesObjeto {
  nome:      string;    // Título exibido no painel
  descricao: string;    // Parágrafo descritivo
  material:  string;    // Linha na tabela
  peso:      string;    // Linha na tabela
  extras?:   string[];  // Lista de características (opcional)
}
```

---

### `ocultarPainel(): void`
Define `display: none` no painel de informações.

---

### `atualizarIndicadorModo(): void`
Cria (na primeira chamada) ou atualiza um pequeno `<div>` fixado na parte inferior central da tela mostrando o modo ativo e os controles relevantes.

---

### `inicializarLuzes(): void`
Adiciona três fontes de luz:
- **AmbientLight** (0.8) — iluminação base global
- **DirectionalLight** (1.5) — luz principal com sombra, posição `(20, 50, 20)`
- **DirectionalLight** (0.3, azulado) — preenchimento para suavizar sombras duras

---

### `carregarModelo(): void`
Usa `GLTFLoader` para carregar `/models/EstruturaLassu.glb`.  
Para cada mesh cujo nome contém `"calculadora"`:
- Salva `posicaoOrigem` e `rotacaoOrigem` (espaço mundial) em `userData`
- Salva `informacoes` (objeto `InformacoesObjeto`) em `userData`
- Adiciona à lista `objetosInterativos`

> **Para adicionar outro tipo de objeto**, troque ou adicione a condição `includes("calculadora")` e defina as informações correspondentes.

---

### `inicializarEventos(): void`
Registra todos os event listeners:

```
keydown / keyup  → movimentação e ações (E, R, F)
mousedown        → pegar / iniciar rotação
mouseup          → arremessar / parar rotação
mousemove        → delta de rotação no Modo Exibição
click            → ativa Pointer Lock
contextmenu      → bloqueia menu de contexto
resize           → ajusta câmera e renderizador
```

---

### `pegarObjeto(): void`
1. Dispara um raio do centro da câmera
2. Verifica interseção com `objetosInterativos`
3. Se acertar: seta `objetoSelecionado`, `estaSegurando = true`
4. Usa `cena.attach()` para mover o objeto para a raiz da cena (evita que ele suma junto com o grupo do GLB)

---

### `arremessarObjeto(): void`
1. Define `estaSegurando = false`
2. Lê a direção da câmera com `getWorldDirection()`
3. Multiplica por `FORCA_LANCAMENTO` e armazena em `velocidadeObjeto`
4. A física de queda é processada em `atualizarFisica()`

---

### `ativarModoExibicao(): void`
1. Se já há um objeto em exibição, chama `devolverObjeto()` primeiro
2. Raycast para encontrar o objeto apontado
3. Reseta `rotacaoX` e `rotacaoY` para zero
4. Desanexa da cena pai com `cena.attach()`
5. Lê `obj.userData.informacoes` e chama `exibirPainel()`

---

### `devolverObjeto(): void`
- Seta `estaRetornando = true` e `estaSegurando = false`
- Zera `velocidadeObjeto`
- Oculta o painel
- A animação de retorno é processada frame a frame em `atualizarFisica()`

---

### `alternarModo(): void`
- Se houver objeto selecionado, chama `devolverObjeto()` antes de trocar
- Inverte `modoAtual` entre `'livre'` e `'exibicao'`
- Atualiza o HUD

---

### `atualizarFisica(dt: number): void`

O método central de simulação. Avalia quatro estados exclusivos:

```
objetoSelecionado existe?
│
├── estaSegurando && modoAtual === 'livre'
│     └─ Lerp posição para 2m à frente da câmera
│        Slerp rotação para a rotação da câmera
│
├── !estaSegurando && !estaRetornando && modoAtual === 'exibicao'
│     └─ Calcula posição base (1.8m à frente)
│        Adiciona flutuação senoidal (sin(tempo × 1.5) × 0.05)
│        Lerp até posicaoBase
│        Slerp até quaternion da rotação manual (rotacaoX, rotacaoY)
│
├── estaRetornando
│     └─ Lerp posição → posicaoOrigem
│        Slerp rotação → rotacaoOrigem
│        Se distância < 0.01 → trava e limpa referência
│
└── física livre (após arremesso)
      └─ velocidadeObjeto.y += GRAVIDADE × dt
         posição += velocidade × dt
         Se y < NIVEL_CHAO → para, agenda retorno em 1.5s
         Se y < NIVEL_ABISMO → retorno imediato
```

---

### `animar(): void`
Loop principal chamado pelo `setAnimationLoop` do renderizador:
1. Calcula `dt` (limitado a 0.1s para evitar saltos)
2. Move o jogador se o Pointer Lock estiver ativo
3. Chama `atualizarFisica(dt)`
4. Renderiza a cena

---

## Sistema de Física

```
Frame N:
  velocidade.y  +=  GRAVIDADE (-18) × dt
  posicao       +=  velocidade × dt

  se posicao.y < NIVEL_CHAO (-15.2):
    posicao.y = NIVEL_CHAO
    velocidade = (0, 0, 0)
    → após 1.5s: estaRetornando = true

  se posicao.y < NIVEL_ABISMO (-60):
    estaRetornando = true   ← segurança extra
```

O dt é obtido com `THREE.Clock` e travado em `0.1s` máximo para garantir estabilidade caso a aba perca foco.

---

## Sistema de HUD

O HUD consiste em dois elementos HTML independentes:

| Elemento | ID | Visibilidade |
|---|---|---|
| Painel de informações | `painel-info` | Apenas no Modo Exibição, com objeto selecionado |
| Indicador de modo | `indicador-modo` | Sempre visível após o início |

Ambos usam `pointerEvents: none` para não interceptar cliques do jogo.

---

## Configuração do Modelo 3D

O arquivo GLB deve estar em `/models/EstruturaLassu.glb` (relativo à raiz do servidor).

Os objetos interativos são identificados por nome. A condição atual:
```typescript
obj.name.toLowerCase().includes('calculadora')
```

Cada objeto interativo precisa ter, em `userData` (configurado em `carregarModelo`):
- `posicaoOrigem: THREE.Vector3` — posição de origem em espaço mundial
- `rotacaoOrigem: THREE.Quaternion` — rotação de origem em espaço mundial
- `informacoes: InformacoesObjeto` — dados para o painel

---

## Como Adicionar Novos Objetos Interativos

1. Nomeie a mesh no seu software 3D com uma palavra-chave (ex: `"livro"`)
2. Em `carregarModelo()`, adicione uma nova condição:
```typescript
if (obj.name.toLowerCase().includes('livro')) {
  // ... código de registro já existente ...
  obj.userData.informacoes = {
    nome:      'Livro Antigo',
    descricao: 'Um manuscrito do século XVIII encontrado no laboratório.',
    material:  'Papel e couro',
    peso:      '≈ 600 g',
    extras:    ['Escrito em latim', '342 páginas'],
  };
  this.objetosInterativos.push(obj);
}
```
3. Isso é tudo! O sistema de raycasting, física e HUD funcionará automaticamente.

---

## Ajuste Fino dos Parâmetros

| O que ajustar | Onde | Dica |
|---|---|---|
| Força do arremesso | `FORCA_LANCAMENTO` | Aumente para arremessar mais longe |
| Gravidade | `GRAVIDADE` | Mais negativo = cai mais rápido |
| Altura do chão | `NIVEL_CHAO` | Deve bater com o piso do seu cenário GLB |
| Distância de pega | `new THREE.Vector3(0, 0, -2)` em `atualizarFisica` | Mude o `-2` para mais perto/longe |
| Distância de exibição | `new THREE.Vector3(0, -0.3, -1.8)` em `atualizarFisica` | Ajuste Z e Y conforme o tamanho do objeto |
| Velocidade de flutuação | `Math.sin(tempo × 1.5)` | Multiplique `1.5` para flutuar mais rápido |
| Amplitude da flutuação | `× 0.05` | Aumente para flutuar mais alto/baixo |
| Sensibilidade de rotação | `const SENSIBILIDADE = 0.01` em `inicializarEventos` | Aumente para girar mais rápido |
| Velocidade do jogador | `15` (normal) / `30` (shift) em `animar` | Ajuste conforme o tamanho do cenário |