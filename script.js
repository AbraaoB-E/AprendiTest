
// -------------------- Firebase Configuration --------------------
// Configuração do Firebase – substitua pelos seus dados se necessário
const firebaseConfig = {
  apiKey: "AIzaSyDujs0cCkS99p5FOCjMoZmCvnERXJNBRBY",
  authDomain: "consultav1.firebaseapp.com",
  projectId: "consultav1",
  storageBucket: "consultav1.firebasestorage.app",
  messagingSenderId: "844307477678",
  appId: "1:844307477678:web:4296211a35d27a2b02e93f",
  measurementId: "G-VPFF191MNJ"
};

// Inicializa o Firebase (se ainda não estiver inicializado)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Referência para o Firestore
const db = firebase.firestore();

// -------------------- Variáveis Globais --------------------

// Array para armazenar todos os documentos de componentes
let allComponents = [];

// -------------------- Referências do DOM --------------------
const componentForm = document.getElementById('componentForm');
const cardsSection = document.getElementById('cardsSection');
const searchInput = document.getElementById('searchInput');
const alertIcon = document.getElementById('alertIcon');
const alertModal = document.getElementById('alertModal');
const alertList = document.getElementById('alertList');
const closeAlertModal = document.getElementById('closeAlertModal');

// -------------------- Funções --------------------

/**
 * Cria um card para um componente específico.
 * @param {Object} doc - Documento do Firestore com os dados do componente.
 * @returns {HTMLElement} - Elemento card do componente.
 */
function createComponentCard(doc) {
  const data = doc.data();
  // Cria o container do card
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = doc.id;

  // Define o conteúdo HTML do card com os detalhes do componente e o menu de ações
  card.innerHTML = `
    <h3>${data.name} (${data.position})</h3>
    <p>Tipo: ${data.type}</p>
    <p>Características: ${data.characteristics || 'Nenhuma'}</p>
    <p>Quantidade: ${data.quantity}</p>
    <div class="menu">
      <span class="menu-dots">&#8942;</span>
      <div class="menu-content">
        <button class="edit-btn">Editar</button>
        <button class="delete-btn">Excluir</button>
        <button class="alert-btn">Sinalizar Qtd. Mínima</button>
      </div>
    </div>
  `;

  // ----- Controle do Menu -----
  // Exibe ou oculta o menu de ações ao clicar nos três pontinhos
  const menu = card.querySelector('.menu');
  menu.querySelector('.menu-dots').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  // ----- Exclusão do Componente -----
  // Remove o componente do Firestore após confirmação
  menu.querySelector('.delete-btn').addEventListener('click', () => {
    if (confirm("Excluir permanentemente?")) {
      db.collection('components').doc(doc.id).delete();
    }
  });

  // ----- Edição do Componente -----
  // Permite editar os dados do componente através de prompts
  menu.querySelector('.edit-btn').addEventListener('click', async () => {
    const newData = {
      name: prompt("Nome:", data.name),
      position: prompt("Posição:", data.position),
      type: prompt("Tipo:", data.type),
      characteristics: prompt("Características:", data.characteristics),
      quantity: parseInt(prompt("Quantidade:", data.quantity))
    };

    // Atualiza os dados se os campos obrigatórios forem preenchidos
    if (newData.name && newData.position && newData.type && newData.quantity) {
      try {
        await db.collection('components').doc(doc.id).update(newData);
      } catch (error) {
        alert(`Erro: ${error.message}`);
      }
    }
  });

  // ----- Sinalização de Quantidade Mínima -----
  // Marca o componente com 'alerted' no Firestore para indicar quantidade mínima
  menu.querySelector('.alert-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await db.collection('components').doc(doc.id).update({ alerted: true });
      // Adiciona uma indicação visual (opcional)
      card.classList.add('alertado');
      menu.classList.remove('active');
    } catch (error) {
      alert(`Erro ao sinalizar: ${error.message}`);
    }
  });

  return card;
}

/**
 * Renderiza os cards dos componentes com base no termo de busca.
 * @param {string} filterTerm - Termo usado para filtrar os componentes.
 */
function renderCards(filterTerm) {
  cardsSection.innerHTML = '';
  // Filtra os componentes pelo nome ou posição
  const filtered = allComponents.filter(doc => {
    const data = doc.data();
    return (
      data.name.toLowerCase().includes(filterTerm) ||
      data.position.toLowerCase().includes(filterTerm)
    );
  });
  // Cria e adiciona cada card filtrado à seção de cards
  filtered.forEach(doc => {
    const card = createComponentCard(doc);
    cardsSection.appendChild(card);
  });
}

// -------------------- Event Listeners --------------------

// Atualiza a lista de componentes e renderiza os cards com base na busca em tempo real
db.collection("components").orderBy("name").onSnapshot((snapshot) => {
  allComponents = snapshot.docs;
  const term = searchInput.value.trim().toLowerCase();
  if (term !== "") {
    renderCards(term);
  } else {
    cardsSection.innerHTML = '';
  }
});

// ----- Adicionar Novo Componente -----
// Captura o envio do formulário e adiciona um novo componente ao Firestore
componentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const componentData = {
    name: componentForm.nameInput.value.trim(),
    position: componentForm.positionInput.value.trim(),
    type: componentForm.typeInput.value,
    characteristics: componentForm.characteristicsInput.value.trim(),
    quantity: parseInt(componentForm.quantityInput.value),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Validação dos campos obrigatórios
  if (!componentData.name || !componentData.position || !componentData.type || !componentData.quantity) {
    alert("Preencha os campos obrigatórios!");
    return;
  }

  try {
    // Verifica se já existe um componente com o mesmo nome e posição
    const duplicate = await db.collection('components')
      .where('name', '==', componentData.name)
      .where('position', '==', componentData.position)
      .get();

    if (!duplicate.empty) {
      alert("Componente já existe!");
      return;
    }

    // Adiciona o componente ao Firestore
    await db.collection('components').add(componentData);
    componentForm.reset();
  } catch (error) {
    alert(`Erro: ${error.message}`);
  }
});

// ----- Busca de Componentes -----
// Atualiza os cards exibidos conforme o termo digitado na busca
searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim().toLowerCase();
  if (term === "") {
    cardsSection.innerHTML = '';
  } else {
    renderCards(term);
  }
});

// ----- Funcionalidade do Modal de Alertas -----
// Ao clicar no ícone de alerta, busca os componentes com 'alerted' == true e exibe no modal
alertIcon.addEventListener('click', async () => {
  try {
    // Consulta os componentes sinalizados
    const querySnapshot = await db.collection('components').where('alerted', '==', true).get();
    alertList.innerHTML = '';

    if (querySnapshot.empty) {
      // Se não houver componentes alertados, mostra mensagem e define o ícone para amarelo
      alertList.innerHTML = '<p>Nenhum componente sinalizado.</p>';
      alertIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #FFD43B;"></i>';
    } else {
      // Define o ícone de alerta como vermelho
      alertIcon.innerHTML = '<i calss="fa-triangle-exclamation" style="color: #ff0000;"></i>';

      // Utiliza um Set para evitar componentes duplicados (baseado em nome e posição)
      const seen = new Set();

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.name}-${data.position}`;
        if (seen.has(key)) return; // Ignora duplicatas
        seen.add(key);

        // Cria um card para cada componente alertado
        const item = document.createElement('div');
        item.className = 'alert-card';
        item.innerHTML = `<div>
          <p><strong>${data.name}</strong> (Qtd.: ${data.quantity}) - Posição: ${data.position}</p>
        </div>`;

        // Cria um botão minimalista para remover o alerta do componente
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-alert-btn';
        removeBtn.textContent = 'Remover alerta';

        // Ao clicar, atualiza o componente removendo a flag 'alerted'
        removeBtn.addEventListener('click', async () => {
          try {
            await db.collection('components').doc(doc.id).update({ alerted: false });
            // Remove o card do alerta
            item.remove();
            // Se não houver mais componentes alertados, atualiza o ícone e exibe mensagem
            if (alertList.querySelectorAll('.alert-card').length === 0) {
              alertIcon.style.color = 'yellow';
              alertList.innerHTML = '<p>Nenhum componente sinalizado.</p>';
            }
          } catch (error) {
            alert(`Erro ao remover alerta: ${error.message}`);
          }
        });

        // Adiciona o botão ao card e o card à lista de alertas
        item.appendChild(removeBtn);
        alertList.appendChild(item);
      });
    }
    // Exibe o modal de alertas
    alertModal.style.display = 'block';
  } catch (error) {
    alert(`Erro ao carregar alertas: ${error.message}`);
  }
});

// ----- Fechar Modal de Alertas -----
// Fecha o modal ao clicar no botão "X"
closeAlertModal.addEventListener('click', () => {
  alertModal.style.display = 'none';
});

// Fecha o modal se o usuário clicar fora do conteúdo do modal
window.addEventListener('click', (e) => {
  if (e.target === alertModal) {
    alertModal.style.display = 'none';
  }
});
