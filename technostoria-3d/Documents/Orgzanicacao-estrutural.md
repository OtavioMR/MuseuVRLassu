# 🏛️ Virtual Reality Museum – Three.js + WebXR

Este projeto consiste no desenvolvimento de um **museu virtual imersivo em primeira pessoa**, utilizando **Three.js**, **TypeScript** e **WebXR**, com suporte tanto para **VR (Meta Quest)** quanto para **desktop (PC)**.

O foco do projeto é a **programação e funcionamento do ambiente virtual**, incluindo:

* Navegação em primeira pessoa
* Interação com objetos
* Colisão
* Organização modular e orientada a objetos

A parte de curadoria, pesquisa ou coleta de dados do museu **não faz parte do escopo** deste repositório.

---

## 🎯 Objetivo do Projeto

Criar uma base sólida e escalável para um museu em realidade virtual que permita:

* Exploração livre do ambiente
* Interação física com objetos (pegar, arremessar, colidir)
* Compatibilidade com VR e PC
* Estrutura de código organizada e manutenível
* Evolução futura para múltiplas salas, exposições e interações

---

## 🧠 Arquitetura Geral

O projeto segue uma **arquitetura modular**, inspirada em conceitos comuns de engines como Unity, porém adaptada ao ecossistema do **Three.js**.

A lógica é separada em:

* **Entidades**: objetos do mundo
* **Sistemas**: regras e comportamentos globais
* **Core**: inicialização e gerenciamento da cena

Essa separação evita código monolítico e facilita manutenção e expansão.

---

## 📁 Estrutura de Pastas

```txt
src/
│
├── core/                # Gerenciamento central (scene, câmera, renderer)
│   ├── SceneManager.ts
│   ├── Renderer.ts
│   ├── CameraRig.ts
│   ├── Input.ts
│
├── entities/            # Entidades do mundo (equivalente a GameObjects)
│   ├── Entity.ts
│   ├── Player.ts
│   ├── Sphere.ts
│
├── environment/         # Elementos do cenário
│   ├── Room.ts
│   ├── Floor.ts
│   ├── Walls.ts
│
├── systems/             # Sistemas de lógica global
│   ├── MovementSystem.ts
│   ├── CollisionSystem.ts
│   ├── PhysicsSystem.ts
│
├── vr/                  # Específico para WebXR / VR
│   ├── VRManager.ts
│   ├── Controllers.ts
│
├── utils/               # Utilidades e constantes
│   ├── MathUtils.ts
│   ├── Constants.ts
│
├── main.ts              # Ponto de entrada da aplicação
```

---

## 🧱 Entidades (Entities)

Entidades representam **objetos que existem no mundo 3D**.

### Classe Base `Entity`

```ts
export abstract class Entity {
  mesh: THREE.Object3D;

  constructor(mesh: THREE.Object3D) {
    this.mesh = mesh;
  }

  update(_dt: number) {}
}
```

Todas as entidades:

* Possuem um `mesh`
* Podem ser atualizadas a cada frame
* São adicionadas à cena pelo `main.ts`

---

### Exemplo: Esfera Interativa

A esfera é um objeto físico que pode ser:

* Colidido
* Pegado
* Arremessado

```ts
export class Sphere extends Entity {
  velocity = new THREE.Vector3();
  radius = 0.5;

  update(dt: number) {
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(0.98); // atrito
  }
}
```

---

### Player (Câmera + Colisão)

O jogador é representado por um **Camera Rig**, que funciona tanto no PC quanto no VR.

* A câmera fica dentro de um `Group`
* A posição do jogador é controlada movendo o rig
* A colisão é calculada com base em um raio

---

## ⚙️ Sistemas (Systems)

Sistemas são responsáveis por **regras globais**, não pertencem a um objeto específico.

### CollisionSystem

Responsável por:

* Evitar atravessar paredes
* Impedir saída da sala
* Fazer rebote simples em objetos arremessados

```ts
if (Math.abs(p.x) > limit) {
  p.x = Math.sign(p.x) * limit;
  v.x *= -0.4;
}
```

Esse sistema é chamado **a cada frame** no loop principal.

---

## 🕹️ Controles

### Desktop (PC)

* Mouse: olhar ao redor
* WASD: movimentação
* Clique: pegar / soltar objeto

Utiliza `PointerLockControls`.

---

### VR (Meta Quest)

* Thumbstick esquerdo: locomoção
* Raycasting para interação
* WebXR via `VRButton`

O mesmo código funciona em ambos os modos, alternando automaticamente.

---

## 🔁 Loop Principal

O loop de renderização segue o padrão:

```ts
entities.forEach(e => e.update(dt));
collisionSystem.update();
renderer.render(scene, camera);
```

Isso garante:

* Atualização consistente
* Separação clara de responsabilidades
* Fácil adição de novos sistemas

---

## 🧩 Modelagem 3D (Blender)

O Blender é utilizado para:

* Criar o ambiente do museu
* Modelar objetos de exposição
* Exportar em `.glb` ou `.gltf`

Fluxo recomendado:

1. Modelar no Blender
2. Exportar como `.glb`
3. Importar no Three.js usando `GLTFLoader`
4. Transformar o modelo em uma `Entity`

---

## 🚀 Próximos Passos

* Sistema de interação genérico (Interface `Interactable`)
* Exposições com texto, áudio e vídeo
* Portas, salas e teleporte
* Física mais avançada (ou integração com Ammo.js)
* UI em VR (painéis, menus flutuantes)

---

## 📌 Tecnologias Utilizadas

* Three.js
* WebXR
* TypeScript
* Vite
* Blender
* Meta Quest

---

## 📜 Licença

Projeto acadêmico / experimental.
Uso livre para fins educacionais.