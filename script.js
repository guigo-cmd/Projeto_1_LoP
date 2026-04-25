const renderer = new THREE.WebGLRenderer({ antialias: true }); //é o "olho" ; antialias: suaviza as bordas
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    
    const scene = new THREE.Scene(); //tudo vai ser adicionado aqui na cena
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 120);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200); //fov, aspect, near, far

    scene.add(new THREE.AmbientLight(0xffffff, 0.7)); //a diferenca pro "sol" é que a luz ambiente ilumina tudo igualmente, sem direção ou sombras

    const sol = new THREE.DirectionalLight(0xfffbe0, 1.0); //cria a luz que ilumina o canvas como um sol
    sol.position.set(20, 40, 10);
    sol.castShadow = true; //faz com que a luz projete sombras
    scene.add(sol);

    //meshLambertMaterial: reage a luz
    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 1000),
      new THREE.MeshLambertMaterial({ color: 0x4a7c3f })
    );
    chao.rotation.x = -Math.PI / 2; //gira o plano para ficar na horizontal
    chao.receiveShadow = true;
    scene.add(chao);

    
    
    const estrada = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 1000),
      new THREE.MeshLambertMaterial({ color: 0x222222 }) //cor do asfalto
    );
    estrada.rotation.x = -Math.PI / 2; //gira o plano para ficar na horizontal
    estrada.position.y = 0.01; //levanta um pouco para evitar interferência visual entre superfícies muito próximas
    scene.add(estrada);

    
    [-5, 5].forEach(x => {
      const faixa = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 1000), //fiz isso para criar as faixas laterais da estrada, que são mais estreitas e continuam até o horizonte
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      faixa.rotation.x = -Math.PI / 2;
      faixa.position.set(x, 0.02, 0);
      scene.add(faixa);
    });

    const COMP_LINHA = 3;
    const ESPACO     = 6;
    const ALCANCE    = 90;
    const QTD_LINHAS = Math.ceil(ALCANCE / ESPACO) + 2; //calcula quantas linhas são necessárias 
    //isso aqui é para criar as linhas centrais da estrada, que dão a sensação de movimento
    const geoLinha = new THREE.PlaneGeometry(0.18, COMP_LINHA);
    const matLinha = new THREE.MeshLambertMaterial({ color: 0xffdd00 });

    
    const linhasFrente = []; //as linhas que vao para frente do carro
    for (let i = 0; i < QTD_LINHAS; i++) {
      const m = new THREE.Mesh(geoLinha, matLinha); //cria a linha
      m.rotation.x = -Math.PI / 2; //gira para ficar na horizontal
      m.position.set(0, 0.03, 0);
      scene.add(m);
      linhasFrente.push(m);
    }

   
    const linhasTras = []; //linhas para trás do carro, caso o jogador vire para tras, para manter a sensação de movimento mesmo olhando para trás
    for (let i = 0; i < QTD_LINHAS; i++) {
      const m = new THREE.Mesh(geoLinha, matLinha);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.03, 0);
      scene.add(m);
      linhasTras.push(m);
    }


   
    const carro = new THREE.Group(); //grupo carro
    scene.add(carro);


    const corpo = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.65, 4), //corpo do carro, um retângulo mais baixo
      new THREE.MeshLambertMaterial({ color: 0xcc2222 })
    );
    corpo.position.y = 0.65;
    corpo.castShadow = true;
    carro.add(corpo);

  
    const cabine = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.55, 2), //cabine do carro, um retângulo menor e mais alto
      new THREE.MeshLambertMaterial({ color: 0xdd3333 })
    );
    cabine.position.set(0, 1.3, -0.2);
    carro.add(cabine);
    
    const rodas = [];
    function criarRoda(x, z) { //função para criar as rodas, que são cilindros finos e largos, girados para ficarem na posição correta, é melhor ser feito por função devido à quantidade de rodas e à necessidade de posicionamento preciso
      const pneu = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      pneu.rotation.z = Math.PI / 2;
      pneu.position.set(x, 0.36, z);
      pneu.castShadow = true;
      carro.add(pneu);
      rodas.push(pneu);
    }
      //basta pensar no jogo de sinais do plano cartesiano para posicionar as rodas
    criarRoda(-1.1,  1.35); // roda da frente esquerda
    criarRoda( 1.1,  1.35); // roda da frente direita
    criarRoda(-1.1, -1.35); // roda de trás esquerda
    criarRoda( 1.1, -1.35); // roda de trás direita

    
    let velocidade = 0;
    let angulo     = 0;
    let offsetLinhas = 0; // controla o deslizamento das linhas

    const teclas = {};
    document.addEventListener('keydown', e => { teclas[e.key] = true;  e.preventDefault(); }); //registra as teclas pressionadas, e.preventDefault() evita que a página role ao usar as setas ou espaço
    document.addEventListener('keyup',   e => { teclas[e.key] = false; });

    // ── Loop ──────────────────────────────────────────────────
    function animar() {
      requestAnimationFrame(animar);

      // Controles
      if (teclas['w'] || teclas['W']) velocidade = Math.min(velocidade + 0.009, 0.3);
      if (teclas['s'] || teclas['S']) velocidade = Math.max(velocidade - 0.009, -0.15);

      velocidade *= 0.96;
      if (Math.abs(velocidade) < 0.001) velocidade = 0;

      if (Math.abs(velocidade) > 0.004) {
        const sentido = velocidade > 0 ? 1 : -1;
        if (teclas['a'] || teclas['A']) angulo += 0.032 * sentido;
        if (teclas['d'] || teclas['D']) angulo -= 0.032 * sentido;
      }

      // Translação do carro
      carro.position.x += Math.sin(angulo) * velocidade; //movimenta o carro na direção que ele está virado, usando seno e cosseno para calcular a direção correta
      carro.position.z += Math.cos(angulo) * velocidade;
      carro.rotation.y  = angulo;

      // Rodas giram
      rodas.forEach(r => r.rotation.x += velocidade * 7);

      // ── Animação das linhas da estrada ──────────────────────
      offsetLinhas += velocidade;

      const base  = carro.position.z;
      const phase = offsetLinhas % ESPACO;

      // FRENTE: linhas se afastam em direção ao horizonte (Z negativo)
      // Reciclam quando passam para trás do carro
      linhasFrente.forEach((linha, i) => {
        let z = base - (i * ESPACO) - phase;
        if (z > base + ESPACO) z -= QTD_LINHAS * ESPACO;
        linha.position.set(0, 0.03, z);
      });

      // TRÁS: linhas se afastam para trás (Z positivo, direção oposta)
      // Reciclam quando saem do alcance para frente
      linhasTras.forEach((linha, i) => {
        let z = base + (i * ESPACO) + phase;
        if (z < base - ESPACO) z += QTD_LINHAS * ESPACO;
        linha.position.set(0, 0.03, z);
      });

      const distCam  = 10; //camera fica a 10 unidades de distância do carro
      const alturaCam = 5;

      // Posição da câmera: atrás e acima do carro
      camera.position.x = carro.position.x - Math.sin(angulo) * distCam; //calcula a posição da câmera usando seno e cosseno para ficar atrás do carro, na direção oposta à que ele está virado
      camera.position.y = alturaCam; 
      camera.position.z = carro.position.z - Math.cos(angulo) * distCam; 

      // Câmera aponta para o carro
      camera.lookAt(carro.position.x, 1, carro.position.z);

      renderer.render(scene, camera); //renderiza a cena a cada frame
    }

    animar();

    // ── Responsividade ────────────────────────────────────────
    window.addEventListener('resize', () => { //ajusta a câmera e o renderer quando a janela é redimensionada
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });