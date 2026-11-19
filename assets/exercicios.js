// Biblioteca inicial de exercícios (o professor pode editar, apagar e cadastrar outros).
// Sem link de vídeo próprio, o botão "Ver execução" abre uma busca no YouTube pelo nome.
const GRUPOS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Quadríceps', 'Posterior de coxa', 'Glúteos', 'Panturrilha', 'Abdômen', 'Lombar', 'Cardio', 'Mobilidade'];
const EXERCICIOS_BASE = [
  ['Supino reto com barra', 'Peito', 'Barra'], ['Supino reto com halteres', 'Peito', 'Halteres'], ['Supino inclinado com barra', 'Peito', 'Barra'],
  ['Supino inclinado com halteres', 'Peito', 'Halteres'], ['Supino declinado', 'Peito', 'Barra'], ['Crucifixo reto', 'Peito', 'Halteres'],
  ['Crucifixo inclinado', 'Peito', 'Halteres'], ['Crossover polia alta', 'Peito', 'Polia'], ['Crossover polia baixa', 'Peito', 'Polia'],
  ['Peck deck (voador)', 'Peito', 'Máquina'], ['Supino máquina', 'Peito', 'Máquina'], ['Flexão de braço', 'Peito', 'Peso corporal'],
  ['Puxada frontal aberta', 'Costas', 'Polia'], ['Puxada frontal supinada', 'Costas', 'Polia'], ['Puxada com triângulo', 'Costas', 'Polia'],
  ['Barra fixa', 'Costas', 'Peso corporal'], ['Remada curvada com barra', 'Costas', 'Barra'], ['Remada unilateral (serrote)', 'Costas', 'Halteres'],
  ['Remada baixa com triângulo', 'Costas', 'Polia'], ['Remada cavalinho', 'Costas', 'Máquina'], ['Remada máquina articulada', 'Costas', 'Máquina'],
  ['Pulldown com corda', 'Costas', 'Polia'], ['Levantamento terra', 'Costas', 'Barra'],
  ['Desenvolvimento com halteres', 'Ombros', 'Halteres'], ['Desenvolvimento com barra', 'Ombros', 'Barra'], ['Desenvolvimento máquina', 'Ombros', 'Máquina'],
  ['Elevação lateral', 'Ombros', 'Halteres'], ['Elevação lateral na polia', 'Ombros', 'Polia'], ['Elevação frontal', 'Ombros', 'Halteres'],
  ['Crucifixo inverso', 'Ombros', 'Halteres'], ['Face pull', 'Ombros', 'Polia'], ['Remada alta', 'Ombros', 'Barra'], ['Encolhimento', 'Ombros', 'Halteres'],
  ['Rosca direta com barra', 'Bíceps', 'Barra'], ['Rosca direta barra W', 'Bíceps', 'Barra'], ['Rosca alternada', 'Bíceps', 'Halteres'],
  ['Rosca martelo', 'Bíceps', 'Halteres'], ['Rosca scott', 'Bíceps', 'Máquina'], ['Rosca concentrada', 'Bíceps', 'Halteres'], ['Rosca na polia', 'Bíceps', 'Polia'],
  ['Tríceps pulley (barra)', 'Tríceps', 'Polia'], ['Tríceps corda', 'Tríceps', 'Polia'], ['Tríceps testa', 'Tríceps', 'Barra'],
  ['Tríceps francês', 'Tríceps', 'Halteres'], ['Tríceps coice', 'Tríceps', 'Halteres'], ['Mergulho no banco', 'Tríceps', 'Peso corporal'], ['Supino fechado', 'Tríceps', 'Barra'],
  ['Rosca de punho', 'Antebraço', 'Barra'], ['Rosca inversa', 'Antebraço', 'Barra'],
  ['Agachamento livre', 'Quadríceps', 'Barra'], ['Agachamento no smith', 'Quadríceps', 'Máquina'], ['Agachamento hack', 'Quadríceps', 'Máquina'],
  ['Leg press 45°', 'Quadríceps', 'Máquina'], ['Cadeira extensora', 'Quadríceps', 'Máquina'], ['Afundo (passada)', 'Quadríceps', 'Halteres'],
  ['Agachamento búlgaro', 'Quadríceps', 'Halteres'], ['Agachamento goblet', 'Quadríceps', 'Halteres'],
  ['Mesa flexora', 'Posterior de coxa', 'Máquina'], ['Cadeira flexora', 'Posterior de coxa', 'Máquina'], ['Stiff', 'Posterior de coxa', 'Barra'],
  ['Levantamento terra romeno', 'Posterior de coxa', 'Barra'], ['Flexora em pé', 'Posterior de coxa', 'Máquina'],
  ['Elevação pélvica (hip thrust)', 'Glúteos', 'Barra'], ['Glúteo na polia (coice)', 'Glúteos', 'Polia'], ['Cadeira abdutora', 'Glúteos', 'Máquina'],
  ['Agachamento sumô', 'Glúteos', 'Halteres'], ['Ponte de glúteo', 'Glúteos', 'Peso corporal'],
  ['Panturrilha em pé', 'Panturrilha', 'Máquina'], ['Panturrilha sentado', 'Panturrilha', 'Máquina'], ['Panturrilha no leg press', 'Panturrilha', 'Máquina'],
  ['Abdominal supra', 'Abdômen', 'Peso corporal'], ['Abdominal infra', 'Abdômen', 'Peso corporal'], ['Prancha', 'Abdômen', 'Peso corporal'],
  ['Prancha lateral', 'Abdômen', 'Peso corporal'], ['Abdominal na polia', 'Abdômen', 'Polia'], ['Elevação de pernas na barra', 'Abdômen', 'Peso corporal'],
  ['Hiperextensão lombar', 'Lombar', 'Peso corporal'], ['Bom dia', 'Lombar', 'Barra'],
  ['Esteira', 'Cardio', 'Máquina'], ['Bicicleta ergométrica', 'Cardio', 'Máquina'], ['Elíptico', 'Cardio', 'Máquina'], ['Escada', 'Cardio', 'Máquina'], ['Corda (pular)', 'Cardio', 'Peso corporal'],
  ['Mobilidade de quadril', 'Mobilidade', 'Peso corporal'], ['Mobilidade de ombro', 'Mobilidade', 'Peso corporal'], ['Alongamento geral', 'Mobilidade', 'Peso corporal'],
];
const METODOS = ['Normal', 'Bi-set', 'Tri-set', 'Drop-set', 'Rest-pause', 'Pirâmide crescente', 'Pirâmide decrescente', 'Cluster', 'FST-7', 'Isometria', 'Excêntrica lenta', 'Até a falha'];
function exerciciosIniciais() {
  return EXERCICIOS_BASE.map(([nome, grupo, equip], i) => ({ id: 'ex' + String(i + 1).padStart(3, '0'), nome, grupo, equipamento: equip, video: '', dica: '' }));
}
