// ================= CONFIGURAÇÃO WHITE LABEL =================
const CONFIG = {
    NOME_SISTEMA: "Controle de Encomendas - Gate", // Nome no topo
    ID_CLIENTE: "banco_dados_gate_v1",             // Mude este ID para cada novo condomínio
};

// ================= VARIÁVEIS GLOBAIS =================
let encomendas = JSON.parse(localStorage.getItem(CONFIG.ID_CLIENTE)) || [];
let selecionadaId = null;
let canvas, ctx, desenhando = false;

// ================= AGENDA DE MORADORES =================
const agendaMoradores = {
    "Gate002": "11994392466",
   
    
};

// ================= INICIALIZAÇÃO =================
window.onload = () => {
    // Aplica o nome do sistema no Título e Header
    document.title = CONFIG.NOME_SISTEMA;
    const h1 = document.querySelector('header h1');
    if(h1) h1.innerText = CONFIG.NOME_SISTEMA;

    renderizarTabela();
    atualizarDashboard();
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
        msg = `Olá, *${item.destinatario}*! 📦\nSua encomenda (NF: *${item.nf}*) chegou no -1 setor de Encomendas.\n*Sala ${item.sala}* (${item.torre}).`;
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
    document.getElementById('tituloForm').innerText = "✏️ Editar Encomenda";
    document.getElementById('btnSalvar').innerText = "Atualizar Encomenda";
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
    const fNF = document.getElementById('filtroNF').value.toLowerCase();
    const fStatus = document.getElementById('filtroStatus').value;

    const filtrados = encomendas.filter(e => {
        const dataFormatada = e.data.split('/').reverse().join('-');
        return (fData === "" || dataFormatada === fData) &&
               (fSala === "" || e.sala.toLowerCase().includes(fSala)) &&
               (fNome === "" || e.destinatario.toLowerCase().includes(fNome)) &&
               (fNF === "" || e.nf.toLowerCase().includes(fNF)) &&
               (fStatus === "" || e.status === fStatus);
    });
    
    renderizarTabela(filtrados);
    
    if (filtrados.length > 0) {
        mostrarMultiplosDetalhes(filtrados);
    } else {
        document.getElementById('resultadoConteudo').innerHTML = '<p class="placeholder-text">Nenhum resultado encontrado.</p>';
        document.getElementById('blocoConfirmarRetirada').style.display = 'none';
    }
}

function renderizarTabela(dados = encomendas) {
    const corpo = document.getElementById('listaCorpo');
    if (!corpo) return;
    corpo.innerHTML = '';

    const ordenados = [...dados].sort((a, b) => {
        const dataA = a.data.split('/').reverse().join('');
        const dataB = b.data.split('/').reverse().join('');
        if (dataA !== dataB) return dataA.localeCompare(dataB);
        if (a.torre !== b.torre) return a.torre === "Gate" ? -1 : 1;
        const salaA = parseInt(a.sala.replace(/\D/g, '')) || 0;
        const salaB = parseInt(b.sala.replace(/\D/g, '')) || 0;
        return salaA - salaB;
    });

    ordenados.forEach(item => {
        const tr = document.createElement('tr');
        tr.onclick = (e) => { if (e.target.tagName !== 'BUTTON') selecionarUnica(item.id); };
        tr.innerHTML = `
            <td>${item.data}</td>
            <td>${item.nf}</td>
            <td style="font-weight:bold; color:#2563eb;">${item.sala}</td>
            <td>${item.torre}</td>
            <td>${item.destinatario}</td>
            <td style="font-weight:bold; color:${item.status === 'Retirado' ? 'green' : '#f59e0b'}">${item.status}</td>
            <td>
                <button onclick="event.stopPropagation(); editar(${item.id})" title="Editar">✏️</button>
                <button onclick="event.stopPropagation(); apagar(${item.id})" title="Excluir">🗑️</button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

// ================= DETALHES E ASSINATURA =================
function mostrarMultiplosDetalhes(itens) {
    const conteudo = document.getElementById('resultadoConteudo');
    conteudo.innerHTML = `<p style="margin-bottom:10px; font-weight:bold; color:#2563eb;">Exibindo ${itens.length} resultado(s):</p>`;
    
    itens.forEach(item => {
        const div = document.createElement('div');
        div.style = "border: 1px solid #ddd; border-left: 5px solid #2563eb; background: #fff; padding: 10px; border-radius: 5px; margin-bottom: 8px; cursor: pointer; font-size: 0.9em;";
        div.onclick = () => selecionarUnica(item.id);
        div.innerHTML = `
            <strong>NF: ${item.nf}</strong> | Sala: ${item.sala} (${item.torre})<br>
            👤 ${item.destinatario}<br>
            <span style="color:${item.status === 'Retirado' ? 'green' : '#f59e0b'}">● ${item.status}</span>
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
        <div style="border-left:5px solid #2563eb; background:#fff; padding:15px; border-radius:8px;">
            <p><strong>📦 NF:</strong> ${item.nf} | <strong>Sala:</strong> ${item.sala} (${item.torre})</p>
            <p><strong>👤 Nome:</strong> ${item.destinatario}</p>
            <p><strong>🚩 Status:</strong> ${item.status}</p>
            ${item.status === 'Retirado' ? `
                <div style="margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
                    <p style="color:green">✅ Retirado por: ${item.quemRetirou}</p>
                    <p><small>${item.dataRetirada}</small></p>
                    <p><strong>Assinatura:</strong></p>
                    <img src="${item.assinatura}" style="width:100%; border:1px solid #ddd; background:#fff;" />
                </div>
            ` : `
                <button onclick="enviarZapManual(${item.id})" style="background:#25d366; color:white; border:none; padding:10px; width:100%; border-radius:5px; cursor:pointer; margin-top:10px;">Reenviar Aviso</button>
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
        const cx = e.clientX || e.touches[0].clientX;
        const cy = e.clientY || e.touches[0].clientY;
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
    if(!nome) return alert("Quem está retirando?");
    const index = encomendas.findIndex(e => e.id === selecionadaId);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    encomendas[index].status = 'Retirado';
    encomendas[index].quemRetirou = nome;
    encomendas[index].dataRetirada = new Date().toLocaleString('pt-BR');
    encomendas[index].assinatura = tempCanvas.toDataURL('image/jpeg', 0.5);

    salvarEAtualizar();
    enviarZap(encomendas[index], 'retirada');
    document.getElementById('nomeRec').value = "";
    document.getElementById('blocoConfirmarRetirada').style.display = 'none';
    selecionarUnica(selecionadaId);
}

function limparAssinatura() { ctx.clearRect(0, 0, canvas.width, canvas.height); }
function enviarZapManual(id) { enviarZap(encomendas.find(e => e.id === id), 'chegada'); }

function visualizarTudo() {
    document.getElementById('filtroData').value = "";
    document.getElementById('filtroSala').value = "";
    document.getElementById('filtroNome').value = "";
    document.getElementById('filtroNF').value = "";
    document.getElementById('filtroStatus').value = "";
    renderizarTabela(encomendas);
    document.getElementById('resultadoConteudo').innerHTML = '<p class="placeholder-text">Clique em uma nota ou use os filtros.</p>';
    document.getElementById('blocoConfirmarRetirada').style.display = 'none';
}

function apagar(id) {
    if(confirm("Deseja realmente excluir esta encomenda?")) {
        encomendas = encomendas.filter(e => e.id !== id);
        salvarEAtualizar();
        document.getElementById('resultadoConteudo').innerHTML = '<p class="placeholder-text">Clique em uma nota.</p>';
        document.getElementById('blocoConfirmarRetirada').style.display = 'none';
    }
}

function exportarCSV() {
    if (encomendas.length === 0) return alert("Nenhuma mercadoria para exportar.");
    let csv = "\ufeff"; 
    csv += "Data;NF;Torre;Sala;Destinatario;Status;Quem Retirou;Data Retirada\n";
    encomendas.forEach(e => {
        csv += `${e.data};${e.nf};${e.torre};${e.sala};${e.destinatario};${e.status};${e.quemRetirou};${e.dataRetirada}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Encomendas_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
