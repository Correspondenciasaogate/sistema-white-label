// ================= CONFIGURAÇÃO WHITE LABEL =================
// Mude os dados abaixo para cada novo cliente/condomínio:
const CONFIG = {
    NOME_SISTEMA: "Logística Residencial - Jardins", // Nome no topo
    ID_CLIENTE: "banco_jardins_v1",               // ID único da "gaveta" de dados
    COR_PRIMARIA: "#16a34a",                       // Cor da marca (Ex: Verde)
    COR_SECUNDARIA: "#64748b"                      // Cor dos botões secundários
};

// ================= VARIÁVEIS GLOBAIS =================
let encomendas = JSON.parse(localStorage.getItem(CONFIG.ID_CLIENTE)) || [];
let selecionadaId = null;
let canvas, ctx, desenhando = false;

// ================= AGENDA DE MORADORES =================
// DICA: No White Label, você substituirá esta lista pelos dados do novo cliente
const agendaMoradores = {
    "Sala101": "11999999999",
    "Sala102": "11888888888",
};

// ================= INICIALIZAÇÃO =================
window.onload = () => {
    // 1. Aplica Identidade Visual (Nome e Título)
    document.title = CONFIG.NOME_SISTEMA;
    const h1 = document.querySelector('header h1');
    if(h1) h1.innerText = CONFIG.NOME_SISTEMA;

    // 2. Aplica a Cor da Marca no CSS
    document.documentElement.style.setProperty('--cor-primaria', CONFIG.COR_PRIMARIA);
    document.documentElement.style.setProperty('--cor-secundaria', CONFIG.COR_SECUNDARIA);

    // 3. Inicia o sistema
    renderizarTabela();
    atualizarDashboard();
    
    // Listeners para automação de telefone
    document.getElementById('sala').addEventListener('input', buscarContatoAutomatico);
    document.getElementById('torre').addEventListener('change', buscarContatoAutomatico);
};

// ================= FUNÇÕES DE APOIO =================
function salvarEAtualizar() {
    localStorage.setItem(CONFIG.ID_CLIENTE, JSON.stringify(encomendas));
    renderizarTabela();
    atualizarDashboard();
}

function buscarContatoAutomatico() {
    const torre = document.getElementById('torre').value;
    const sala = document.getElementById('sala').value.trim();
    const campoTelefone = document.getElementById('telefone');
    const chave = torre + sala;
    if (agendaMoradores[chave]) {
        campoTelefone.value = agendaMoradores[chave];
        campoTelefone.style.backgroundColor = "#e8f5e9";
    } else {
        campoTelefone.style.backgroundColor = "";
    }
}

function atualizarDashboard() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const tHoje = encomendas.filter(e => e.data === hoje).length;
    const tAguardando = encomendas.filter(e => e.status === 'Aguardando retirada').length;
    const tRetirados = encomendas.filter(e => e.status === 'Retirado').length;
    
    document.getElementById('dashTotal').innerText = tHoje;
    document.getElementById('dashAguardando').innerText = tAguardando;
    document.getElementById('dashRetirados').innerText = tRetirados;
}

// ================= WHATSAPP =================
function enviarZap(item, tipo) {
    if (!item.telefone) return;
    const tel = item.telefone.replace(/\D/g, '');
    let msg = "";
    if (tipo === 'chegada') {
        msg = `Olá, *${item.destinatario}*! 📦\nSua encomenda (NF: *${item.nf}*) chegou no setor de logística.\n*Local:* ${item.torre} - Sala ${item.sala}.`;
    } else {
        msg = `✅ *Confirmação de Retirada*\nOlá, *${item.destinatario}*!\nSua encomenda (NF: *${item.nf}*) foi retirada por *${item.quemRetirou}* em ${item.dataRetirada}.`;
    }
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, '_blank');
}

// ================= CADASTRO E EDIÇÃO =================
document.getElementById('formRecebimento').addEventListener('submit', function(e) {
    e.preventDefault();
    const idExistente = document.getElementById('editId').value;

    const dados = {
        nf: document.getElementById('notaFiscal').value,
        torre: document.getElementById('torre').value,
        sala: document.getElementById('sala').value,
        destinatario: document.getElementById('destinatario').value,
        telefone: document.getElementById('telefone').value,
    };

    if (idExistente) {
        const index = encomendas.findIndex(enc => enc.id == idExistente);
        encomendas[index] = { ...encomendas[index], ...dados };
        cancelarEdicao();
    } else {
        const nova = {
            id: Date.now(),
            ...dados,
            data: new Date().toLocaleDateString('pt-BR'),
            status: 'Aguardando retirada',
            quemRetirou: '',
            dataRetirada: '',
            assinatura: ''
        };
        encomendas.push(nova);
        enviarZap(nova, 'chegada');
    }

    salvarEAtualizar();
    this.reset();
});

function editar(id) {
    const item = encomendas.find(e => e.id === id);
    if (!item) return;
    document.getElementById('editId').value = item.id;
    document.getElementById('notaFiscal').value = item.nf;
    document.getElementById('torre').value = item.torre;
    document.getElementById('sala').value = item.sala;
    document.getElementById('destinatario').value = item.destinatario;
    document.getElementById('telefone').value = item.telefone;
    document.getElementById('tituloForm').innerText = "✏️ Editar Registro";
    document.getElementById('btnSalvar').innerText = "Atualizar";
    document.getElementById('btnCancelarEdit').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicao() {
    document.getElementById('formRecebimento').reset();
    document.getElementById('editId').value = "";
    document.getElementById('tituloForm').innerText = "📦 Novo Recebimento";
    document.getElementById('btnSalvar').innerText = "Salvar Mercadoria";
    document.getElementById('btnCancelarEdit').style.display = "none";
}

// ================= FILTROS E TABELA =================
function aplicarFiltros() {
    const fData = document.getElementById('filtroData').value; 
    const fSala = document.getElementById('filtroSala').value.toLowerCase();
    const fNome = document.getElementById('filtroNome').value.toLowerCase();
    const fStatus = document.getElementById('filtroStatus').value;

    const filtrados = encomendas.filter(e => {
        const dataFormatada = e.data.split('/').reverse().join('-');
        return (fData === "" || dataFormatada === fData) &&
               (fSala === "" || e.sala.toLowerCase().includes(fSala)) &&
               (fNome === "" || e.destinatario.toLowerCase().includes(fNome)) &&
               (fStatus === "" || e.status === fStatus);
    });
    
    renderizarTabela(filtrados);
    
    if (filtrados.length > 0) {
        mostrarMultiplosDetalhes(filtrados);
    } else {
        document.getElementById('resultadoConteudo').innerHTML = '<p>Nenhum resultado.</p>';
        document.getElementById('blocoConfirmarRetirada').style.display = 'none';
    }
}

function renderizarTabela(dados = encomendas) {
    const corpo = document.getElementById('listaCorpo');
    if (!corpo) return;
    corpo.innerHTML = '';

    // Ordenação lógica: Data -> Torre -> Sala
    const ordenados = [...dados].sort((a, b) => {
        const dataA = a.data.split('/').reverse().join('');
        const dataB = b.data.split('/').reverse().join('');
        if (dataA !== dataB) return dataB.localeCompare(dataA); // Mais recentes primeiro
        if (a.torre !== b.torre) return a.torre.localeCompare(b.torre);
        return parseInt(a.sala) - parseInt(b.sala);
    });

    ordenados.forEach(item => {
        const tr = document.createElement('tr');
        tr.onclick = (e) => { if (e.target.tagName !== 'BUTTON') selecionarUnica(item.id); };
        tr.innerHTML = `
            <td>${item.data}</td>
            <td>${item.nf}</td>
            <td style="font-weight:bold; color:var(--cor-primaria);">${item.sala}</td>
            <td>${item.torre}</td>
            <td>${item.destinatario}</td>
            <td style="font-weight:bold; color:${item.status === 'Retirado' ? 'var(--success)' : 'var(--warning)'}">${item.status}</td>
            <td>
                <button class="btn-secundario" onclick="event.stopPropagation(); editar(${item.id})">✏️</button>
                <button class="btn-secundario" onclick="event.stopPropagation(); apagar(${item.id})">🗑️</button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

// ================= DETALHES E ASSINATURA =================
function mostrarMultiplosDetalhes(itens) {
    const conteudo = document.getElementById('resultadoConteudo');
    conteudo.innerHTML = `<p style="color:var(--cor-primaria); font-weight:bold;">Encontrado: ${itens.length} itens</p>`;
    
    itens.forEach(item => {
        const div = document.createElement('div');
        div.className = "card-detalhe-lista";
        div.onclick = () => selecionarUnica(item.id);
        div.innerHTML = `
            <h4>NF: ${item.nf}</h4>
            <p><strong>Sala:</strong> ${item.sala} (${item.torre})</p>
            <p><strong>Status:</strong> ${item.status}</p>
        `;
        conteudo.appendChild(div);
    });
    document.getElementById('blocoConfirmarRetirada').style.display = 'none';
}

function selecionarUnica(id) {
    selecionadaId = id;
    const item = encomendas.find(e => e.id === id);
    if (!item) return;
    
    document.getElementById('resultadoConteudo').innerHTML = `
        <div class="card-detalhe-lista" style="border-left-width:8px;">
            <h4>${item.destinatario}</h4>
            <p><strong>NF:</strong> ${item.nf}</p>
            <p><strong>Local:</strong> ${item.torre} - Sala ${item.sala}</p>
            <p><strong>Data Entrada:</strong> ${item.data}</p>
            <hr>
            ${item.status === 'Retirado' ? `
                <p style="color:var(--success); font-weight:bold;">✅ Retirado por: ${item.quemRetirou}</p>
                <p><small>${item.dataRetirada}</small></p>
                <img src="${item.assinatura}" class="assinatura-preview" />
            ` : `
                <p style="color:var(--warning); font-weight:bold;">🕒 Aguardando Retirada</p>
                <button onclick="enviarZapManual(${item.id})" class="btn-principal" style="background:#25d366; margin-top:10px;">Reenviar WhatsApp</button>
            `}
        </div>
    `;

    const blocoR = document.getElementById('blocoConfirmarRetirada');
    if (item.status === 'Aguardando retirada') {
        blocoR.style.display = 'block';
        setTimeout(configurarCanvas, 100);
    } else {
        blocoR.style.display = 'none';
    }
}

function configurarCanvas() {
    canvas = document.getElementById('canvasAssinatura');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        return { x: cx - rect.left, y: cy - rect.top };
    };

    canvas.onmousedown = (e) => { desenhando = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    canvas.onmousemove = (e) => { if(desenhando) { const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } };
    window.onmouseup = () => { desenhando = false; };
    
    canvas.ontouchstart = (e) => { desenhando = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    canvas.ontouchmove = (e) => { if(desenhando) { const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } e.preventDefault(); };
    canvas.ontouchend = () => { desenhando = false; };
}

function finalizarEntrega() {
    const nome = document.getElementById('nomeRec').value;
    if(!nome) return alert("Digite o nome de quem está retirando!");
    
    const index = encomendas.findIndex(e => e.id === selecionadaId);
    
    // Converte assinatura para imagem
    const imgAssinatura = canvas.toDataURL('image/png');

    encomendas[index].status = 'Retirado';
    encomendas[index].quemRetirou = nome;
    encomendas[index].dataRetirada = new Date().toLocaleString('pt-BR');
    encomendas[index].assinatura = imgAssinatura;

    salvarEAtualizar();
    enviarZap(encomendas[index], 'retirada');
    
    document.getElementById('nomeRec').value = "";
    document.getElementById('blocoConfirmarRetirada').style.display = 'none';
    selecionarUnica(selecionadaId);
}

function limparAssinatura() { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }
function enviarZapManual(id) { enviarZap(encomendas.find(e => e.id === id), 'chegada'); }

function apagar(id) {
    if(confirm("Deseja realmente excluir?")) {
        encomendas = encomendas.filter(e => e.id !== id);
        salvarEAtualizar();
        document.getElementById('resultadoConteudo').innerHTML = '<p>Selecione um item.</p>';
    }
}

function visualizarTudo() {
    document.getElementById('formFiltros').reset();
    renderizarTabela(encomendas);
}

function exportarCSV() {
    let csv = "\ufeffData;NF;Torre;Sala;Destinatario;Status;Quem Retirou;Data Retirada\n";
    encomendas.forEach(e => {
        csv += `${e.data};${e.nf};${e.torre};${e.sala};${e.destinatario};${e.status};${e.quemRetirou};${e.dataRetirada}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Encomendas.csv`;
    link.click();
}
