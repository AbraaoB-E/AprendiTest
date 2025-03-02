// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "AIzaSyDujs0cCkS99p5FOCjMoZmCvnERXJNBRBY",
  authDomain: "consultav1.firebaseapp.com",
  projectId: "consultav1",
  storageBucket: "consultav1.firebasestorage.app",
  messagingSenderId: "844307477678",
  appId: "1:844307477678:web:4296211a35d27a2b02e93f",
  measurementId: "G-VPFF191MNJ"
};

// Inicialização do Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Variável para armazenar todos os documentos recebidos
let allComponents = [];

// Referências DOM
const componentForm = document.getElementById('componentForm');
const cardsSection = document.getElementById('cardsSection');
const searchInput = document.getElementById('searchInput');
const alertIcon = document.getElementById('alertIcon');
const alertModal = document.getElementById('alertModal');
const alertList = document.getElementById('alertList');
const closeAlertModal = document.getElementById('closeAlertModal');

// ----------- FUNÇÕES PRINCIPAIS -----------

// Cria o card para cada componente
function createComponentCard(doc) {
  const data = doc.data();
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = doc.id;

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

  // Controle do menu
  const menu = card.querySelector('.menu');
  menu.querySelector('.menu-dots').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  // Excluir componente
  menu.querySelector('.delete-btn').addEventListener('click', () => {
    if (confirm("Excluir permanentemente?")) {
      db.collection('components').doc(doc.id).delete();
    }
  });

  // Editar componente
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

  // Sinalizar componente com quantidade mínima (atualiza o campo "alerted" no Firestore)
  menu.querySelector('.alert-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await db.collection('components').doc(doc.id).update({ alerted: true });
      // Opcional: adicionar feedback visual no card sinalizado
      card.classList.add('alertado');
      menu.classList.remove('active');
    } catch (error) {
      alert(`Erro ao sinalizar: ${error.message}`);
    }
  });

  return card;
}

// Renderiza os cards com base no termo de busca
function renderCards(filterTerm) {
  cardsSection.innerHTML = '';
  const filtered = allComponents.filter(doc => {
    const data = doc.data();
    return (
      data.name.toLowerCase().includes(filterTerm) ||
      data.position.toLowerCase().includes(filterTerm)
    );
  });
  filtered.forEach(doc => {
    const card = createComponentCard(doc);
    cardsSection.appendChild(card);
  });
}

// ----------- EVENT LISTENERS -----------

// Atualiza a lista global e renderiza os cards conforme a busca
db.collection("components").orderBy("name").onSnapshot((snapshot) => {
  allComponents = snapshot.docs;
  // Se houver termo na busca, renderiza os cards; caso contrário, limpa a seção
  const term = searchInput.value.trim().toLowerCase();
  if (term !== "") {
    renderCards(term);
  } else {
    cardsSection.innerHTML = '';
  }
});

// Adiciona novo componente
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
    // Verifica duplicatas
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

// Filtro de busca: exibe os cards somente se houver texto no campo; caso contrário, limpa a área
searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim().toLowerCase();
  if (term === "") {
    cardsSection.innerHTML = '';
  } else {
    renderCards(term);
  }
});

// Ao clicar no ícone de alerta, busca e exibe os componentes sinalizados (alerted == true)
alertIcon.addEventListener('click', async () => {
  try {
    const querySnapshot = await db.collection('components').where('alerted', '==', true).get();
    alertList.innerHTML = '';
    if (querySnapshot.empty) {
      alertList.innerHTML = '<p>Nenhum componente sinalizado.</p>';
    } else {
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const item = document.createElement('div');
        item.innerHTML = `<p><strong>${data.name}</strong> (Qtd.: ${data.quantity}) - Posição: ${data.position}</p>`;
        alertList.appendChild(item);
      });
    }
    alertModal.style.display = 'block';
  } catch (error) {
    alert(`Erro ao carregar alertas: ${error.message}`);
  }
});

// Fecha o modal de alerta ao clicar no "X"
closeAlertModal.addEventListener('click', () => {
  alertModal.style.display = 'none';
});

// Fecha o modal se o usuário clicar fora dele
window.addEventListener('click', (e) => {
  if (e.target === alertModal) {
    alertModal.style.display = 'none';
  }
});
