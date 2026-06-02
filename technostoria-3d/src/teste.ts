/**
 * ============================================================
 *  JOGO 3D — SISTEMA DE INTERAÇÃO COM OBJETOS
 * ============================================================
 *
 *  MODOS DE INTERAÇÃO
 *  ------------------
 *  [MODO LIVRE]     → Pressione [F] para ativar
 *      - Clique / [E]   : Pega o objeto
 *      - Soltar Mouse   : Arremessa com velocidade
 *      - O objeto cai com gravidade e retorna automaticamente
 *
 *  [MODO EXIBIÇÃO]  → Pressione [F] para alternar
 *      - O objeto flutua suavemente à sua frente
 *      - Arraste o mouse (segurando [E] ou Botão Direito) para girar
 *      - Um painel 2D exibe informações do objeto
 *      - [R] retorna o objeto ao lugar de origem
 *
 *  MOVIMENTAÇÃO
 *  ------------
 *      [W / A / S / D] : Move o jogador
 *      [Shift]         : Correr
 *      [F]             : Alterna entre Modo Livre ↔ Modo Exibição
 *
 * ============================================================
 */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ────────────────────────────────────────────────────────────
//  TIPOS AUXILIARES
// ────────────────────────────────────────────────────────────

/**
 * Define as informações exibidas no painel quando o objeto
 * está no Modo Exibição.
 */
interface InformacoesObjeto {
  nome: string;
  descricao: string;
  material: string;
  peso: string;
  extras?: string[];
}

/** Modo de interação atual com o objeto selecionado. */
type ModoInteracao = 'livre' | 'exibicao';

// ────────────────────────────────────────────────────────────
//  CLASSE PRINCIPAL
// ────────────────────────────────────────────────────────────

class Jogo {

  // ── Núcleo Three.js ──────────────────────────────────────
  private cena: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderizador: THREE.WebGLRenderer;
  private controles: PointerLockControls;
  private jogador: THREE.Group;

  // ── Raycasting (detecção de clique em objetos 3D) ────────
  /**
   * Raycaster usado para detectar qual objeto 3D o jogador
   * está mirando ao centro da tela.
   */
  private raycaster = new THREE.Raycaster();
  /**
   * Ponto fixo no centro da tela (0,0) para o raycaster.
   * Instanciado uma única vez para evitar alocação por frame.
   */
  private origemRaio = new THREE.Vector2(0, 0);

  // ── Estado do teclado ────────────────────────────────────
  /** Mapa simples de teclas pressionadas no momento. */
  private teclas = {
    w: false, a: false, s: false, d: false,
    shift: false,
  };

  // ── Objetos interativos ──────────────────────────────────
  /** Lista de meshes que podem ser pegas/exibidas pelo jogador. */
  private objetosInterativos: THREE.Object3D[] = [];

  // ── Estado do objeto selecionado ─────────────────────────
  /** Mesh atualmente selecionada (em mãos ou em exibição). */
  private objetoSelecionado: THREE.Mesh | null = null;
  /** Indica se o jogador está segurando o objeto (Modo Livre). */
  private estaSegurando = false;
  /** Indica se o objeto está voltando automaticamente ao lugar de origem. */
  private estaRetornando = false;
  /** Velocidade física do objeto quando jogado (Modo Livre). */
  private velocidadeObjeto = new THREE.Vector3();

  // ── Modo de interação ────────────────────────────────────
  /** Modo atual: 'livre' (pegar/jogar) ou 'exibicao' (flutuar/girar). */
  private modoAtual: ModoInteracao = 'livre';

  // ── Rotação manual (Modo Exibição) ───────────────────────
  /**
   * Indica se o botão de rotação está pressionado
   * (Botão direito do mouse ou tecla [E] no Modo Exibição).
   */
  private rotacionandoObjeto = false;
  /** Acúmulo de rotação no eixo X (pitch) da peça em exibição. */
  private rotacaoX = 0;
  /** Acúmulo de rotação no eixo Y (yaw) da peça em exibição. */
  private rotacaoY = 0;
  /**
   * Última posição X do mouse — usada para calcular o delta
   * de rotação entre frames no Modo Exibição.
   */
  private ultimoMouseX = 0;
  /**
   * Última posição Y do mouse — usada para calcular o delta
   * de rotação entre frames no Modo Exibição.
   */
  private ultimoMouseY = 0;

  // ── Animação de flutuação (Modo Exibição) ────────────────
  /**
   * Tempo acumulado em segundos, usado para calcular o
   * efeito de flutuação senoidal no Modo Exibição.
   */
  private tempoFlutuacao = 0;

  // ── Painel de informações (HUD 2D) ───────────────────────
  /**
   * Elemento HTML do painel de informações que aparece
   * no Modo Exibição.
   */
  private painelInfo: HTMLDivElement;

  // ── Física ───────────────────────────────────────────────
  /** Aceleração gravitacional (negativa = puxa para baixo). */
  private readonly GRAVIDADE = -18.0;
  /** Multiplicador de velocidade ao arremessar o objeto. */
  private readonly FORCA_LANCAMENTO = 12;
  /** Altura mínima do chão — ajuste conforme o cenário GLB. */
  private readonly NIVEL_CHAO = -15.2;
  /** Se o objeto cair abaixo disso, é teleportado de volta. */
  private readonly NIVEL_ABISMO = -60;

  // ── Utilitários ──────────────────────────────────────────
  private relogio = new THREE.Clock();

  // ────────────────────────────────────────────────────────────────────
  //  CONSTRUTOR
  // ────────────────────────────────────────────────────────────────────

  constructor() {

    // ── Cena e câmera ─────────────────────────────────────
    this.cena = new THREE.Scene();
    this.cena.background = new THREE.Color(0x222222);
    this.cena.fog = new THREE.Fog(0x222222, 60, 200);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    // ── Renderizador WebGL ────────────────────────────────
    this.renderizador = new THREE.WebGLRenderer({ antialias: true });
    this.renderizador.setSize(window.innerWidth, window.innerHeight);
    this.renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderizador.xr.enabled = true;
    this.renderizador.shadowMap.enabled = true;
    this.renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderizador.domElement);
    document.body.appendChild(VRButton.createButton(this.renderizador));

    // ── Jogador (câmera dentro de um grupo para mover juntos) ─
    this.jogador = new THREE.Group();
    this.jogador.position.set(0, 4, 10);
    this.jogador.add(this.camera);
    this.cena.add(this.jogador);

    // ── Controles de primeira pessoa ──────────────────────
    this.controles = new PointerLockControls(this.camera, document.body);

    // ── Painel HUD (criado antes dos eventos) ─────────────
    this.painelInfo = this.criarPainelInfo();

    // ── Inicializações ────────────────────────────────────
    this.inicializarLuzes();
    this.inicializarEventos();
    this.carregarModelo();

    // ── Loop de animação ──────────────────────────────────
    this.renderizador.setAnimationLoop(this.animar.bind(this));
  }

  // ───────────────────────────────────────────────────────────────────
  //  HUD — PAINEL DE INFORMAÇÕES
  // ────────────────────────────────────────────────────────────────────

  /**
   * Cria e estiliza o elemento HTML do painel de informações.
   * O painel fica oculto por padrão e é exibido apenas no Modo Exibição.
   *
   * @returns O elemento <div> criado e inserido no DOM.
   */
  private criarPainelInfo(): HTMLDivElement {
    const painel = document.createElement('div');
    painel.id = 'painel-info';

    Object.assign(painel.style, {
      position: 'fixed',
      top: '50%',
      right: '2rem',
      transform: 'translateY(-50%)',
      width: '260px',
      background: 'rgba(10, 10, 20, 0.88)',
      border: '1px solid rgba(120, 200, 255, 0.35)',
      borderRadius: '12px',
      padding: '1.2rem 1.4rem',
      color: '#e8f4ff',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      fontSize: '0.88rem',
      lineHeight: '1.6',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'none',          // oculto por padrão
      flexDirection: 'column',
      gap: '0.5rem',
      transition: 'opacity 0.3s ease',
      zIndex: '9999',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);

    document.body.appendChild(painel);
    return painel;
  }

  /**
   * Atualiza o conteúdo do painel com as informações do objeto
   * e o exibe na tela.
   *
   * @param info - Objeto com os dados a serem exibidos.
   */
  private exibirPainel(info: InformacoesObjeto): void {
    const extrasHtml = info.extras
      ? info.extras.map(e => `<li>${e}</li>`).join('')
      : '';

    this.painelInfo.innerHTML = `
      <div style="
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(120,200,255,0.7);
        margin-bottom: 0.3rem;
      ">🔍 Modo Exibição</div>

      <div style="
        font-size: 1.1rem;
        font-weight: 600;
        color: #fff;
        border-bottom: 1px solid rgba(120,200,255,0.2);
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
      ">${info.nome}</div>

      <p style="color:rgba(200,225,255,0.85); margin:0 0 0.6rem 0;">
        ${info.descricao}
      </p>

      <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
        <tr>
          <td style="color:rgba(120,200,255,0.7); padding: 2px 0; width:45%;">Material</td>
          <td>${info.material}</td>
        </tr>
        <tr>
          <td style="color:rgba(120,200,255,0.7); padding: 2px 0;">Peso</td>
          <td>${info.peso}</td>
        </tr>
      </table>

      ${extrasHtml ? `
        <ul style="
          margin: 0.6rem 0 0 0;
          padding-left: 1.1rem;
          color: rgba(200,225,255,0.8);
          font-size:0.82rem;
        ">${extrasHtml}</ul>` : ''}

      <div style="
        margin-top: 0.8rem;
        font-size: 0.75rem;
        color: rgba(120,200,255,0.55);
        border-top: 1px solid rgba(120,200,255,0.15);
        padding-top: 0.5rem;
      ">
        🖱️ Btn. direito + arrastar = girar<br>
        [R] Devolver ao lugar
      </div>
    `;

    this.painelInfo.style.display = 'flex';
  }

  /**
   * Oculta o painel de informações.
   */
  private ocultarPainel(): void {
    this.painelInfo.style.display = 'none';
  }

  // ────────────────────────────────────────────────────────────────────
  //  INDICADOR DE MODO (HUD pequeno)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Atualiza o indicador de modo na tela (criado na primeira chamada).
   */
  private atualizarIndicadorModo(): void {
    let indicador = document.getElementById('indicador-modo') as HTMLDivElement;

    if (!indicador) {
      indicador = document.createElement('div');
      indicador.id = 'indicador-modo';
      Object.assign(indicador.style, {
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,10,20,0.75)',
        border: '1px solid rgba(120,200,255,0.3)',
        borderRadius: '8px',
        padding: '0.4rem 1rem',
        color: '#e8f4ff',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '0.8rem',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
        zIndex: '9999',
        transition: 'all 0.3s ease',
      } as CSSStyleDeclaration);
      document.body.appendChild(indicador);
    }

    if (this.modoAtual === 'livre') {
      indicador.innerHTML = '✋ <b>Modo Livre</b> — [E] Pegar · Soltar = Arremessar · [F] Trocar modo';
      indicador.style.borderColor = 'rgba(255,180,80,0.5)';
    } else {
      indicador.innerHTML = '🔍 <b>Modo Exibição</b> — [E] Exibir objeto · Btn.Dir = Girar · [R] Devolver · [F] Trocar modo';
      indicador.style.borderColor = 'rgba(80,180,255,0.5)';
    }
  }

  // ────────────────────────────────────────────────────────────────────
  //  INICIALIZAÇÃO — LUZES
  // ────────────────────────────────────────────────────────────────────

  /**
   * Adiciona luz ambiente e direcional (com sombra) à cena.
   */
  private inicializarLuzes(): void {
    // Luz ambiente: ilumina tudo de forma suave, sem direção
    this.cena.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Luz direcional: simula o sol, projeta sombras
    const luzDirecional = new THREE.DirectionalLight(0xffffff, 1.5);
    luzDirecional.position.set(20, 50, 20);
    luzDirecional.castShadow = true;
    luzDirecional.shadow.mapSize.set(2048, 2048);
    luzDirecional.shadow.camera.near = 0.5;
    luzDirecional.shadow.camera.far = 300;
    this.cena.add(luzDirecional);

    // Luz de preenchimento: reduz sombras muito escuras
    const luzPreenchimento = new THREE.DirectionalLight(0x8888ff, 0.3);
    luzPreenchimento.position.set(-20, 10, -20);
    this.cena.add(luzPreenchimento);
  }

  // ────────────────────────────────────────────────────────────────────
  //  INICIALIZAÇÃO — CARREGAMENTO DO MODELO
  // ────────────────────────────────────────────────────────────────────

  /**
   * Carrega o modelo GLB do cenário e registra os objetos
   * interativos (identificados pelo nome "calculadora").
   *
   * Os objetos interativos recebem em `userData`:
   *   - `posicaoOrigem`  : THREE.Vector3 — posição mundial inicial
   *   - `rotacaoOrigem`  : THREE.Quaternion — rotação mundial inicial
   *   - `informacoes`    : InformacoesObjeto — dados para o painel
   */
  private carregarModelo(): void {
    const carregador = new GLTFLoader();
    carregador.load('/models/EstruturaLassu.glb', (gltf) => {
      const modelo = gltf.scene;
      modelo.position.set(-170, -15, 0);
      this.cena.add(modelo);

      modelo.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;

        obj.castShadow = true;
        obj.receiveShadow = true;

        if (!obj.name.toLowerCase().includes('calculadora')) return;

        // Garante que as matrizes mundiais estão atualizadas
        obj.updateMatrixWorld(true);

        // Salva a posição e rotação globais para o retorno funcionar
        const posicaoMundial = new THREE.Vector3();
        const rotacaoMundial = new THREE.Quaternion();
        obj.getWorldPosition(posicaoMundial);
        obj.getWorldQuaternion(rotacaoMundial);

        obj.userData.posicaoOrigem = posicaoMundial.clone();
        obj.userData.rotacaoOrigem = rotacaoMundial.clone();

        // ── Informações exibidas no Modo Exibição ─────────
        obj.userData.informacoes = {
          nome: 'Calculadora Científica',
          descricao: 'Calculadora de alta precisão utilizada em laboratórios de engenharia e física aplicada.',
          material: 'ABS + Visor LCD',
          peso: '≈ 180 g',
          extras: [
            'Funções trigonométricas',
            'Cálculo de matrizes',
            'Memória de 7 registros',
            'Alimentação solar + pilha',
          ],
        } as InformacoesObjeto;

        this.objetosInterativos.push(obj);
      });
    });
  }

  // ────────────────────────────────────────────────────────────────────
  //  INICIALIZAÇÃO — EVENTOS DE INPUT
  // ────────────────────────────────────────────────────────────────────

  /**
   * Registra todos os event listeners do jogo:
   * teclado, mouse (botões e movimento) e redimensionamento.
   */
  private inicializarEventos(): void {

    // ── Teclado — pressionado ─────────────────────────────
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': this.teclas.w = true; break;
        case 'KeyA': this.teclas.a = true; break;
        case 'KeyS': this.teclas.s = true; break;
        case 'KeyD': this.teclas.d = true; break;
        case 'ShiftLeft': this.teclas.shift = true; break;

        // [E] — ação principal (pegar ou exibir, conforme o modo)
        case 'KeyE':
          if (this.modoAtual === 'livre') this.pegarObjeto();
          else this.ativarModoExibicao();
          break;

        // [R] — devolver objeto ao lugar de origem
        case 'KeyR':
          this.devolverObjeto();
          break;

        // [F] — alternar entre Modo Livre e Modo Exibição
        case 'KeyF':
          this.alternarModo();
          break;
      }
    });

    // ── Teclado — solto ───────────────────────────────────
    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.teclas.w = false; break;
        case 'KeyA': this.teclas.a = false; break;
        case 'KeyS': this.teclas.s = false; break;
        case 'KeyD': this.teclas.d = false; break;
        case 'ShiftLeft': this.teclas.shift = false; break;

        // Soltar [E] no Modo Livre arremessa o objeto
        case 'KeyE':
          if (this.modoAtual === 'livre') this.arremessarObjeto();
          break;
      }
    });

    // ── Mouse — botão pressionado ─────────────────────────
    document.addEventListener('mousedown', (e) => {
      if (!this.controles.isLocked) return;

      if (e.button === 0) {
        // Botão esquerdo: pegar (Modo Livre) ou exibir (Modo Exibição)
        if (this.modoAtual === 'livre') this.pegarObjeto();
        else this.ativarModoExibicao();
      }

      if (e.button === 2) {
        // Botão direito: iniciar rotação (Modo Exibição) ou pegar
        if (this.modoAtual === 'exibicao' && this.objetoSelecionado) {
          this.rotacionandoObjeto = true;
          this.ultimoMouseX = e.clientX;
          this.ultimoMouseY = e.clientY;
        }
      }
    });

    // ── Mouse — botão solto ───────────────────────────────
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.modoAtual === 'livre') {
        this.arremessarObjeto();
      }
      if (e.button === 2) {
        this.rotacionandoObjeto = false;
      }
    });

    // ── Mouse — movimento (rotação do objeto em exibição) ──
    document.addEventListener('mousemove', (e) => {
      if (!this.rotacionandoObjeto || !this.objetoSelecionado) return;

      const deltaX = e.clientX - this.ultimoMouseX;
      const deltaY = e.clientY - this.ultimoMouseY;

      /** Sensibilidade da rotação manual (radianos por pixel). */
      const SENSIBILIDADE = 0.01;
      this.rotacaoY += deltaX * SENSIBILIDADE;
      this.rotacaoX += deltaY * SENSIBILIDADE;

      // Limita a inclinação vertical para evitar rotação de cabeça-para-baixo
      this.rotacaoX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotacaoX));

      this.ultimoMouseX = e.clientX;
      this.ultimoMouseY = e.clientY;
    });

    // ── Click para ativar o Pointer Lock ─────────────────
    document.addEventListener('click', () => {
      if (!this.estaSegurando) this.controles.lock();
    });

    // ── Impede o menu de contexto no botão direito ────────
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // ── Redimensionamento da janela ───────────────────────
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderizador.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Exibe o indicador de modo ao iniciar ─────────────
    this.atualizarIndicadorModo();
  }

  // ────────────────────────────────────────────────────────────────────
  //  AÇÕES DE INTERAÇÃO — MODO LIVRE
  // ────────────────────────────────────────────────────────────────────

  /**
   * Tenta pegar o objeto 3D que está no centro da mira do jogador.
   * Funciona lançando um raio invisível (raycast) a partir da câmera.
   * Se acertar um objeto interativo, ele é "anexado" ao jogador.
   */
  private pegarObjeto(): void {
    this.raycaster.setFromCamera(this.origemRaio, this.camera);
    const colisoes = this.raycaster.intersectObjects(this.objetosInterativos, true);

    if (colisoes.length === 0) return;

    this.objetoSelecionado = colisoes[0].object as THREE.Mesh;
    this.estaSegurando = true;
    this.estaRetornando = false;
    this.velocidadeObjeto.set(0, 0, 0);

    // Desanexa do pai atual e coloca diretamente na cena raiz
    // (evita que o objeto "some" junto com o grupo do cenário)
    this.cena.attach(this.objetoSelecionado);
  }

  /**
   * Solta o objeto com a velocidade da direção em que o jogador
   * está olhando multiplicada por FORCA_LANCAMENTO.
   * A partir daí, a física (gravidade) assume o controle.
   */
  private arremessarObjeto(): void {
    if (!this.objetoSelecionado || !this.estaSegurando) return;

    this.estaSegurando = false;

    const direcao = new THREE.Vector3();
    this.camera.getWorldDirection(direcao);
    this.velocidadeObjeto.copy(direcao).multiplyScalar(this.FORCA_LANCAMENTO);
  }

  // ────────────────────────────────────────────────────────────────────
  //  AÇÕES DE INTERAÇÃO — MODO EXIBIÇÃO
  // ────────────────────────────────────────────────────────────────────

  /**
   * Ativa o Modo Exibição para o objeto apontado pelo jogador.
   * O objeto é trazido para flutuar à frente e o painel de
   * informações é exibido.
   */
  private ativarModoExibicao(): void {
    this.raycaster.setFromCamera(this.origemRaio, this.camera);
    const colisoes = this.raycaster.intersectObjects(this.objetosInterativos, true);

    if (colisoes.length === 0) return;

    this.objetoSelecionado = colisoes[0].object as THREE.Mesh;
    this.estaSegurando = false;
    this.estaRetornando = false;

    // Reseta a rotação acumulada para começar do ângulo atual do objeto
    this.rotacaoX = 0;
    this.rotacaoY = 0;

    // Exibe o painel com as informações
    const info = this.objetoSelecionado.userData.informacoes as InformacoesObjeto;
    if (info) this.exibirPainel(info);
  }

  /**
   * Devolve o objeto selecionado à sua posição e rotação de origem,
   * com animação suave (lerp). O painel é ocultado automaticamente.
   */
  private devolverObjeto(): void {
    if (!this.objetoSelecionado) return;
    this.estaSegurando = false;
    this.estaRetornando = true;
    this.velocidadeObjeto.set(0, 0, 0);
    this.ocultarPainel();
  }

  // ────────────────────────────────────────────────────────────────────
  //  ALTERNÂNCIA DE MODO
  // ────────────────────────────────────────────────────────────────────

  /**
   * Alterna entre Modo Livre e Modo Exibição.
   * Se houver um objeto em mãos, ele é devolvido antes da troca.
   */
  private alternarModo(): void {
    // Limpa o estado atual antes de trocar
    if (this.objetoSelecionado) {
      this.devolverObjeto();
    }

    this.modoAtual = this.modoAtual === 'livre' ? 'exibicao' : 'livre';
    this.atualizarIndicadorModo();
  }

  // ────────────────────────────────────────────────────────────────────
  //  FÍSICA E ATUALIZAÇÃO DO OBJETO
  // ────────────────────────────────────────────────────────────────────

  /**
   * Atualiza a posição e rotação do objeto selecionado a cada frame,
   * levando em conta o modo de interação atual.
   *
   * @param dt - Delta time em segundos (tempo desde o último frame).
   */
  private atualizarFisica(dt: number): void {
    if (!this.objetoSelecionado) return;

    // ── Segurando (Modo Livre) ────────────────────────────
    if (this.estaSegurando && this.modoAtual === 'livre') {
      // Posição alvo: 2 metros à frente da câmera
      const posicaoAlvo = new THREE.Vector3(0, 0, -2);
      posicaoAlvo.applyMatrix4(this.camera.matrixWorld);

      // Interpola suavemente para a posição alvo (efeito "magnético")
      this.objetoSelecionado.position.lerp(posicaoAlvo, 0.2);
      this.objetoSelecionado.quaternion.slerp(this.camera.quaternion, 0.1);

      // ── Flutuando (Modo Exibição) ─────────────────────────
      // ── Analisando na Mesa (Modo Exibição Estático) ─────────
    } else if (!this.estaSegurando && !this.estaRetornando && this.modoAtual === 'exibicao') {

      // 1. Mantém o objeto na posição original da mesa
      const posOrigem = this.objetoSelecionado.userData.posicaoOrigem as THREE.Vector3;
      this.objetoSelecionado.position.lerp(posOrigem, 0.1);

      // 2. Calcula a nova rotação baseada no mouse + rotação inicial
      const rotacaoMouse = new THREE.Quaternion();
      rotacaoMouse.setFromEuler(new THREE.Euler(this.rotacaoX, this.rotacaoY, 0, 'YXZ'));

      const rotOrigem = this.objetoSelecionado.userData.rotacaoOrigem as THREE.Quaternion;

      // Combina a rotação que o usuário faz com a rotação que o objeto já tinha
      const rotacaoFinal = new THREE.Quaternion().multiplyQuaternions(rotacaoMouse, rotOrigem);

      // Aplica suavemente
      this.objetoSelecionado.quaternion.slerp(rotacaoFinal, 0.15);
    }

    // ── Retornando ao lugar de origem ─────────────────────
    else if (this.estaRetornando) {
      const posOrigem = this.objetoSelecionado.userData.posicaoOrigem as THREE.Vector3;
      const rotOrigem = this.objetoSelecionado.userData.rotacaoOrigem as THREE.Quaternion;

      this.objetoSelecionado.position.lerp(posOrigem, 0.1);
      this.objetoSelecionado.quaternion.slerp(rotOrigem, 0.1);

      // Quando chegar perto o suficiente, trava na posição final
      if (this.objetoSelecionado.position.distanceTo(posOrigem) < 0.01) {
        this.objetoSelecionado.position.copy(posOrigem);
        this.objetoSelecionado.quaternion.copy(rotOrigem);
        this.estaRetornando = false;
        this.objetoSelecionado = null;
      }

      // ── Física livre (após arremesso) ─────────────────────
    } else if (!this.estaSegurando && !this.estaRetornando) {
      // Aplica gravidade
      this.velocidadeObjeto.y += this.GRAVIDADE * dt;
      this.objetoSelecionado.position.addScaledVector(this.velocidadeObjeto, dt);

      // Colisão com o chão: para o objeto e agenda retorno automático
      if (this.objetoSelecionado.position.y < this.NIVEL_CHAO) {
        this.objetoSelecionado.position.y = this.NIVEL_CHAO;
        this.velocidadeObjeto.set(0, 0, 0);

        // Retorna automaticamente após 1,5 segundos parado no chão
        setTimeout(() => {
          if (!this.estaSegurando && this.objetoSelecionado) {
            this.estaRetornando = true;
          }
        }, 1500);
      }

      // Segurança: se cair no abismo, reseta imediatamente
      if (this.objetoSelecionado.position.y < this.NIVEL_ABISMO) {
        this.estaRetornando = true;
        this.velocidadeObjeto.set(0, 0, 0);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────
  //  LOOP PRINCIPAL
  // ────────────────────────────────────────────────────────────────────

  /**
   * Chamado a cada frame pelo renderizador.
   * Processa movimento do jogador, física dos objetos e renderiza a cena.
   */
  private animar(): void {
    // Limita o dt a 0.1s para evitar saltos físicos em frames muito longos
    const dt = Math.min(this.relogio.getDelta(), 0.1);

    // ── Movimentação do jogador ───────────────────────────
    if (this.controles.isLocked) {
      const velocidade = (this.teclas.shift ? 30 : 15) * dt;
      if (this.teclas.w) this.controles.moveForward(velocidade);
      if (this.teclas.s) this.controles.moveForward(-velocidade);
      if (this.teclas.a) this.controles.moveRight(-velocidade);
      if (this.teclas.d) this.controles.moveRight(velocidade);
    }

    // ── Física / posicionamento do objeto ─────────────────
    this.atualizarFisica(dt);

    // ── Renderização ──────────────────────────────────────
    this.renderizador.render(this.cena, this.camera);
  }
}

// ────────────────────────────────────────────────────────────
//  INICIALIZAÇÃO
// ────────────────────────────────────────────────────────────

/** Inicia o jogo assim que o script é carregado. */
new Jogo();