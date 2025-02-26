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

// Referências DOM
const componentForm = document.getElementById('componentForm');
const cardsSection = document.getElementById('cardsSection');
const searchInput = document.getElementById('searchInput');

// ----------- FUNÇÕES PRINCIPAIS -----------

// Cria cards dos componentes
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

  return card;
}

// ----------- EVENT LISTENERS -----------

// Carrega dados iniciais
db.collection("components").orderBy("name").onSnapshot((snapshot) => {
  cardsSection.innerHTML = '';
  snapshot.docs.forEach(doc => {
    cardsSection.appendChild(createComponentCard(doc));
  });
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

  // Validação
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

    // Adiciona ao Firestore
    await db.collection('components').add(componentData);
    componentForm.reset();
  } catch (error) {
    alert(`Erro: ${error.message}`);
  }
});

// Filtro de busca
searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(term) ? 'block' : 'none';
  });
});