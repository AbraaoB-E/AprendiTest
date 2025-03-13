// -------------------- Configuração do Firebase --------------------

// Configuração do Firebase (substitua pelos seus dados, se necessário)


const firebaseConfig = {
  apiKey: "AIzaSyDujs0cCkS99p5FOCjMoZmCvnERXJNBRBY",
  authDomain: "consultav1.firebaseapp.com",
  projectId: "consultav1",
  storageBucket: "consultav1.firebasestorage.app",
  messagingSenderId: "844307477678",
  appId: "1:844307477678:web:4296211a35d27a2b02e93f",
  measurementId: "G-VPFF191MNJ"
};

// Inicializa o Firebase se ainda não estiver iniciado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Obtém a referência para o Firestore
const db = firebase.firestore();

// -------------------- Variáveis Globais --------------------

// Array que armazenará todos os documentos (componentes) recebidos do Firestore
let allComponents = [];

// -------------------- Referências aos Elementos do DOM --------------------

// Formulário de cadastro de componente
const componentForm = document.getElementById('componentForm');
// Seção onde os cards dos componentes serão renderizados
const cardsSection = document.getElementById('cardsSection');
// Campo de busca para filtrar os componentes
const searchInput = document.getElementById('searchInput');
// Ícone de alerta (localizado no header) para indicar componentes sinalizados
const alertIcon = document.getElementById('alertIcon');
// Modal para exibir os componentes sinalizados (alertados)
const alertModal = document.getElementById('alertModal');
// Container dentro do modal que receberá os cards de alerta
const alertList = document.getElementById('alertList');
// Botão para fechar o modal de alerta
const closeAlertModal = document.getElementById('closeAlertModal');

// -------------------- Funções Principais --------------------

/**
 * Cria um card para exibir os dados de um componente.
 * @param {Object} doc - Documento do Firestore com os dados do componente.
 * @returns {HTMLElement} - Elemento card contendo as informações e ações do componente.
 */
function createComponentCard(doc) {
  const data = doc.data();
  // Cria o elemento container do card
  const card = document.createElement('div');
  card.className = 'card';
  // Define um atributo data para identificar o card pelo id do documento
  card.dataset.id = doc.id;

  // Insere o conteúdo HTML do card com os dados do componente e o menu de ações
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

  // ----- Controle do Menu de Ações -----
  // Alterna a exibição do menu quando o ícone (três pontinhos) é clicado
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
  // Permite editar os dados do componente via prompts e atualiza o documento no Firestore
  menu.querySelector('.edit-btn').addEventListener('click', async () => {
    const newData = {
      name: prompt("Nome:", data.name),
      position: prompt("Posição:", data.position),
      type: prompt("Tipo:", data.type),
      characteristics: prompt("Características:", data.characteristics),
      quantity: parseInt(prompt("Quantidade:", data.quantity))
    };

    if (newData.name && newData.position && newData.type && newData.quantity) {
      try {
        await db.collection('components').doc(doc.id).update(newData);
      } catch (error) {
        alert(`Erro: ${error.message}`);
      }
    }
  });

  // ----- Sinalização de Quantidade Mínima -----
  // Atualiza o documento definindo "alerted" para true quando o botão é clicado
  menu.querySelector('.alert-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await db.collection('components').doc(doc.id).update({ alerted: true });
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
  // Limpa o container de cards
  cardsSection.innerHTML = '';
  // Filtra os componentes conforme o termo digitado (nome ou posição)
  const filtered = allComponents.filter(doc => {
    const data = doc.data();
    return (
      data.name.toLowerCase().includes(filterTerm) ||
      data.position.toLowerCase().includes(filterTerm)
    );
  });
  // Cria e adiciona cada card filtrado ao container
  filtered.forEach(doc => {
    const card = createComponentCard(doc);
    cardsSection.appendChild(card);
  });
}

// -------------------- Event Listeners --------------------

// Listener para atualizar os componentes em tempo real via snapshot do Firestore
db.collection("components").orderBy("name").onSnapshot((snapshot) => {
  // Atualiza o array global com os documentos atuais
  allComponents = snapshot.docs;
  
  // Renderiza os cards conforme o termo de busca (se houver)
  const term = searchInput.value.trim().toLowerCase();
  if (term !== "") {
    renderCards(term);
  } else {
    cardsSection.innerHTML = '';
  }
  
  // Atualiza automaticamente o ícone de alerta conforme a existência de componentes sinalizados
  const hasAlerted = snapshot.docs.some(doc => {
    const data = doc.data();
    return data.alerted === true;
  });
  if (hasAlerted) {
    // Se houver pelo menos um componente sinalizado, o ícone fica vermelho
    alertIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ff0000;"></i>';
  } else {
    // Caso contrário, o ícone permanece amarelo
    alertIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #FFD43B;"></i>';
  }
});

// Listener para o envio do formulário de cadastro de componente
componentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Coleta os dados do formulário
  const componentData = {
    name: componentForm.nameInput.value.trim(),
    position: componentForm.positionInput.value.trim(),
    type: componentForm.typeInput.value,
    characteristics: componentForm.characteristicsInput.value.trim(),
    quantity: parseInt(componentForm.quantityInput.value),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Validação: verifica se os campos obrigatórios foram preenchidos
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

    // Adiciona o novo componente ao Firestore
    await db.collection('components').add(componentData);
    componentForm.reset();
  } catch (error) {
    alert(`Erro: ${error.message}`);
  }
});

// Listener para o campo de busca: atualiza os cards conforme o termo digitado
searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim().toLowerCase();
  if (term === "") {
    cardsSection.innerHTML = '';
  } else {
    renderCards(term);
  }
});

// Listener para o ícone de alerta: exibe o modal com os componentes sinalizados
alertIcon.addEventListener('click', async () => {
  try {
    // Consulta os componentes sinalizados (alerted == true)
    const querySnapshot = await db.collection('components').where('alerted', '==', true).get();
    alertList.innerHTML = '';

    if (querySnapshot.empty) {
      // Se não houver componentes sinalizados, exibe mensagem
      alertList.innerHTML = '<p>Nenhum componente sinalizado.</p>';
    } else {
      // Se houver, cria os itens de alerta
      const seen = new Set();
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.name}-${data.position}`;
        if (seen.has(key)) return;
        seen.add(key);

        // Cria um elemento para o alerta do componente
        const item = document.createElement('div');
        item.className = 'alert-card';
        item.innerHTML = `<div>
          <p><strong>${data.name}</strong> (Qtd.: ${data.quantity}) - Posição: ${data.position}</p>
        </div>`;

        // Cria o botão para remover o alerta
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-alert-btn';
        removeBtn.textContent = 'Remover alerta';

        // Ao clicar, atualiza o documento removendo a flag "alerted"
        removeBtn.addEventListener('click', async () => {
          try {
            await db.collection('components').doc(doc.id).update({ alerted: false });
            item.remove();
            if (alertList.querySelectorAll('.alert-card').length === 0) {
              alertList.innerHTML = '<p>Nenhum componente sinalizado.</p>';
            }
          } catch (error) {
            alert(`Erro ao remover alerta: ${error.message}`);
          }
        });

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

// Listener para fechar o modal ao clicar no "X"
closeAlertModal.addEventListener('click', () => {
  alertModal.style.display = 'none';
});

// Listener para fechar o modal se o usuário clicar fora do conteúdo do modal
window.addEventListener('click', (e) => {
  if (e.target === alertModal) {
    alertModal.style.display = 'none';
  }
});
