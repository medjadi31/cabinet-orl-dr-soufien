
import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, CalendarDays, Users, FileHeart, Wallet,
  ChartNoAxesCombined, Settings, Search, Plus, LogOut,
  Menu, X, Stethoscope, Clock, CheckCircle2, AlertCircle,
  UserRound, ClipboardList, ArrowUpRight, RefreshCw,
  Pencil, Eye, Printer, Save, History, ChevronRight, FileText
} from 'lucide-react';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

const SERVICES = [
  'Consultation ORL',
  'Consultation ORL de contrôle',
  'Consultation ORL pédiatrique',
  'Consultation pour deuxième avis',
  'Nasofibroscopie',
  'Otoscopie',
  'Audiométrie',
  'Impédancemétrie / Tympanométrie',
  'Examen de la gorge et du larynx',
  'Consultation d’allergologie',
  'Bilan allergologique',
  'Tests cutanés d’allergie',
  'Extraction de bouchon de cérumen',
  'Lavage auriculaire',
  'Extraction de corps étranger',
  'Évaluation des vertiges',
  'Bilan auditif',
  'Suivi des troubles de l’audition',
  'Soins ORL',
  'Autre'
];

const nav = [
  ['dashboard', 'Tableau de bord', Activity],
  ['patients', 'Patients', Users],
  ['appointments', 'Rendez-vous', CalendarDays],
  ['consultations', 'Consultations', FileHeart],
  ['prescriptions', 'Ordonnance', FileText],
  ['billing', 'Facturation', Wallet],
  ['reports', 'Statistiques', ChartNoAxesCombined],
  ['settings', 'Paramètres', Settings]
];

const today = () => new Date().toISOString().slice(0, 10);

const money = value =>
  `${Number(value || 0).toLocaleString('fr-FR')} DA`;

const emptyPatient = {
  first_name: '',
  last_name: '',
  phone: '',
  birth_date: '',
  sex: '',
  address: '',
  notes: ''
};

const emptyConsultation = {
  patient_id: '',
  service_name: 'Consultation ORL',
  fee_amount: '',
  reason: '',
  history: '',
  clinical_exam: '',
  orl_exam: '',
  diagnosis: '',
  treatment: '',
  prescription: '',
  follow_up: ''
};

const emptyAppointment = {
  patient_id: '',
  appointment_date: today(),
  appointment_time: '09:00',
  reason: '',
  status: 'scheduled'
};

const emptyPayment = {
  patient_id: '',
  consultation_id: '',
  amount: '',
  payment_method: 'Espèces',
  payment_date: today(),
  notes: ''
};

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [section, setSection] = useState('dashboard');
  const [mobileNav, setMobileNav] = useState(false);

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const [showPatient, setShowPatient] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({ patient_id: '', content: '' });
  const [printingPrescription, setPrintingPrescription] = useState(null);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const [editingPatient, setEditingPatient] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState(false);

  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [consultationForm, setConsultationForm] = useState(emptyConsultation);
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointment);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);

  const [saving, setSaving] = useState(false);

  const demo = !supabase;

  // AUTHENTIFICATION
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, value) => {
        setSession(value);
      });

    return () => subscription.unsubscribe();
  }, []);

  // CHARGEMENT DES DONNÉES
  useEffect(() => {
    if (session) loadData();
  }, [session]);

  // SYNCHRONISATION EN TEMPS RÉEL
  useEffect(() => {
    if (!supabase || !session) return;

    const channel = supabase
      .channel('clinic-live-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'patients'
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments'
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'consultations'
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prescriptions'
      }, () => loadData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  async function loadData() {
    if (!supabase || !session) return;

    setError('');

    try {
      const [p, a, c, b, rx] = await Promise.all([
        supabase.from('patients')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase.from('appointments')
          .select('*, patients(first_name,last_name)')
          .order('appointment_date'),

        supabase.from('consultations')
          .select('*')
          .order('consultation_date', { ascending: false }),

        supabase.from('payments')
          .select('*')
          .order('payment_date', { ascending: false }),

        supabase.from('prescriptions')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      for (const result of [p, a, c, b, rx]) {
        if (result.error) throw result.error;
      }

      setPatients(p.data || []);
      setAppointments(a.data || []);
      setConsultations(c.data || []);
      setPayments(b.data || []);
      setPrescriptions(rx.data || []);

      // Actualiser le dossier patient ouvert
      setSelectedPatient(current => {
        if (!current) return null;
        return (p.data || []).find(x => x.id === current.id) || current;
      });

    } catch (e) {
      setError(e.message || 'Erreur de chargement');
    }
  }

  // AUTHENTIFICATION
  async function signIn(e) {
    e.preventDefault();
    setError('');

    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setError(error.message);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  // RECHERCHE DES PATIENTS
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    return patients.filter(p =>
      `${p.first_name || ''} ${p.last_name || ''} ${p.phone || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [patients, query]);

  // HISTORIQUE DU PATIENT SÉLECTIONNÉ
  const patientHistory = useMemo(() => {
    if (!selectedPatient) return [];

    return consultations
      .filter(c => c.patient_id === selectedPatient.id)
      .sort((a, b) =>
        new Date(b.consultation_date) -
        new Date(a.consultation_date)
      );
  }, [selectedPatient, consultations]);

  const todayAppointments = appointments.filter(
    a => a.appointment_date === today()
  );

  const totalPayments = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0), 0
  );

  function paidFor(consultationId) {
    return payments
      .filter(p => p.consultation_id === consultationId)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  function patientName(id) {
    const p = patients.find(x => x.id === id);
    return p ? `${p.last_name} ${p.first_name}` : 'Patient';
  }

  // OUVRIR LE DOSSIER DU PATIENT
  function openPatient(patient) {
    setSelectedPatient(patient);
    setEditingPatient(false);
    setSelectedConsultation(null);
    setEditingConsultation(false);
  }

  // OUVRIR UNE ANCIENNE CONSULTATION
  function openConsultation(consultation) {
    setSelectedConsultation(consultation);
    setEditingConsultation(false);
  }

  // MODIFIER LES INFORMATIONS DU PATIENT
  function startEditPatient() {
    setPatientForm({
      first_name: selectedPatient.first_name || '',
      last_name: selectedPatient.last_name || '',
      phone: selectedPatient.phone || '',
      birth_date: selectedPatient.birth_date || '',
      sex: selectedPatient.sex || '',
      address: selectedPatient.address || '',
      notes: selectedPatient.notes || ''
    });

    setEditingPatient(true);
  }

  async function updatePatient(e) {
    e.preventDefault();
    if (!selectedPatient || !supabase) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('patients')
        .update(patientForm)
        .eq('id', selectedPatient.id);

      if (error) throw error;

      await loadData();
      setSelectedPatient({
        ...selectedPatient,
        ...patientForm
      });

      setEditingPatient(false);
      setNotice('Dossier patient modifié avec succès.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // MODIFIER UNE ANCIENNE CONSULTATION
  function startEditConsultation() {
    setConsultationForm({
      patient_id: selectedConsultation.patient_id,
      service_name: selectedConsultation.service_name || 'Consultation ORL',
      fee_amount: selectedConsultation.fee_amount ?? '',
      reason: selectedConsultation.reason || '',
      history: selectedConsultation.history || '',
      clinical_exam: selectedConsultation.clinical_exam || '',
      orl_exam: selectedConsultation.orl_exam || '',
      diagnosis: selectedConsultation.diagnosis || '',
      treatment: selectedConsultation.treatment || '',
      prescription: selectedConsultation.prescription || '',
      follow_up: selectedConsultation.follow_up || ''
    });

    setEditingConsultation(true);
  }

  async function updateConsultation(e) {
    e.preventDefault();
    if (!selectedConsultation || !supabase) return;

    setSaving(true);
    setError('');

    try {
      const fee = consultationForm.fee_amount === ''
        ? null
        : Number(consultationForm.fee_amount);

      if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
        throw new Error('Veuillez saisir un prix valide en DA.');
      }

      const { error } = await supabase
        .from('consultations')
        .update({
          ...consultationForm,
          fee_amount: fee,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConsultation.id);

      if (error) throw error;

      const updated = {
        ...selectedConsultation,
        ...consultationForm,
        fee_amount: fee
      };

      await loadData();
      setSelectedConsultation(updated);
      setEditingConsultation(false);
      setNotice('Consultation modifiée avec succès.');

    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // CRÉER UN NOUVEAU PATIENT
  async function savePatient(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { error } = await supabase
        .from('patients')
        .insert(patientForm);

      if (error) throw error;

      await loadData();
      setShowPatient(false);
      setPatientForm(emptyPatient);
      setNotice('Patient enregistré.');

    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // CRÉER UN RENDEZ-VOUS
  async function saveAppointment(e) {
    e.preventDefault();
    setError('');

    if (!appointmentForm.patient_id) {
      return setError('Veuillez sélectionner un patient.');
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('appointments')
        .insert(appointmentForm);

      if (error) throw error;

      await loadData();
      setShowAppointment(false);
      setAppointmentForm(emptyAppointment);
      setNotice('Rendez-vous enregistré.');

    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // CRÉER UNE NOUVELLE CONSULTATION
  async function saveConsultation(e) {
    e.preventDefault();
    setError('');

    if (!consultationForm.patient_id) {
      return setError('Veuillez sélectionner un patient.');
    }

    const fee = consultationForm.fee_amount === ''
      ? null
      : Number(consultationForm.fee_amount);

    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
      return setError('Veuillez saisir un prix valide en DA.');
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          ...consultationForm,
          fee_amount: fee,
          consultation_date: new Date().toISOString(),
          created_by: session.user.id
        })
        .select()
        .single();

      if (error) throw error;

      await loadData();
      setShowConsultation(false);
      setConsultationForm(emptyConsultation);
      setNotice('Consultation enregistrée.');

      if (selectedPatient && selectedPatient.id === data.patient_id) {
        setSelectedConsultation(data);
      }

    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ENREGISTRER UNE ORDONNANCE AUTONOME
  async function savePrescription(e) {
    e.preventDefault();
    setError('');

    if (!prescriptionForm.patient_id) {
      return setError('Veuillez sélectionner un patient.');
    }
    if (!prescriptionForm.content.trim()) {
      return setError('Veuillez écrire le contenu de l’ordonnance.');
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: prescriptionForm.patient_id,
          content: prescriptionForm.content.trim(),
          created_by: session?.user?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      await loadData();
      setPrescriptionForm({ patient_id: '', content: '' });
      setNotice('Ordonnance enregistrée avec succès.');
      setPrintingPrescription({
        ...data,
        patient: patients.find(p => p.id === data.patient_id) || null
      });
    } catch (e) {
      setError(e.message || 'Erreur lors de l’enregistrement de l’ordonnance.');
    } finally {
      setSaving(false);
    }
  }

  // ENREGISTRER UN PAIEMENT
  async function savePayment(e) {
    e.preventDefault();
    setError('');

    const amount = Number(paymentForm.amount);

    if (!paymentForm.patient_id ||
        !Number.isFinite(amount) || amount <= 0) {
      return setError('Veuillez sélectionner un patient et saisir un montant valide.');
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          ...paymentForm,
          amount,
          currency: 'DZD',
          consultation_id: paymentForm.consultation_id || null
        });

      if (error) throw error;

      await loadData();
      setShowPayment(false);
      setPaymentForm(emptyPayment);
      setNotice('Paiement enregistré.');

    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }


  if (authLoading) {
    return <div className="center">Chargement sécurisé…</div>;
  }

  if (supabase && !session) {
    return (
      <div className="login-wrap">
        <form className="login-card" onSubmit={signIn}>
          <img src="/assets/icon-foreground.png" alt="Logo Cabinet ORL" className="clinic-logo login-logo" />
          <p className="eyebrow">ESPACE PROFESSIONNEL</p>
          <h1>CABINET ORL</h1>
          <h2>Dr M. SOUFIEN</h2>
          <p className="muted">Connectez-vous à votre espace médical.</p>
          {error && <div className="error">{error}</div>}
          <label>Email professionnel
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>Mot de passe
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className="primary full">Se connecter</button>
          <small>Accès réservé au personnel autorisé.</small>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <img src="/assets/icon-foreground.png" alt="Logo Cabinet ORL" className="clinic-logo" />
          <div><b>CABINET ORL</b><span>Dr M. SOUFIEN</span></div>
          <button className="close-nav" onClick={() => setMobileNav(false)}><X /></button>
        </div>
        <div className="side-label">MENU PRINCIPAL</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={section === id ? 'nav-item active' : 'nav-item'}
              onClick={() => { setSection(id); setMobileNav(false); }}>
              <Icon size={18} /><span>{label}</span>
              {id === 'appointments' && todayAppointments.length > 0 && <i>{todayAppointments.length}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure"><CheckCircle2 size={16} /><span>Données protégées<br /><small>Connexion sécurisée</small></span></div>
          <button className="nav-item" onClick={signOut}><LogOut size={18} />Déconnexion</button>
        </div>
      </aside>
      {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileNav(true)}><Menu /></button>
          <div><div className="crumb">CABINET / <b>{nav.find(n => n[0] === section)?.[1].toUpperCase()}</b></div>
            <div className="top-sub">Gestion médicale et administrative</div></div>
          <div className="top-actions"><span className="today">{new Date().toLocaleDateString('fr-FR')}</span><div className="avatar">DS</div></div>
        </header>
        <div className="content">
          {demo && <div className="demo-banner"><AlertCircle size={17} /><span><b>Mode aperçu</b> — données fictives, aucune sauvegarde en ligne.</span></div>}
          {error && <div className="error inline-error">{error}</div>}
          {notice && <div className="success" onClick={() => setNotice('')}>{notice} <button>×</button></div>}

          {section === 'dashboard' && <>
            <div className="page-heading"><div><p className="eyebrow">VUE D’ENSEMBLE</p><h1>Tableau de bord</h1><p className="muted">Bienvenue dans votre espace de gestion, Docteur.</p></div>
              <button className="primary" onClick={() => setShowAppointment(true)}><Plus size={17} />Nouveau rendez-vous</button></div>
            <div className="stats-grid">
              <Stat icon={Users} label="Patients enregistrés" value={patients.length} tone="blue" />
              <Stat icon={CalendarDays} label="RDV aujourd’hui" value={todayAppointments.length} tone="green" />
              <Stat icon={FileHeart} label="Consultations" value={consultations.length} tone="violet" />
              <Stat icon={Wallet} label="Encaissements" value={money(totalPayments)} tone="gold" />
            </div>
            <section className="panel"><div className="panel-head"><div><h3>Prochains rendez-vous</h3><p>Planning du cabinet</p></div>
              <button className="text-btn" onClick={() => setSection('appointments')}>Voir tout <ArrowUpRight size={15} /></button></div>
              <AppointmentList items={appointments.slice(0, 5)} patients={patients} /></section>
            <section className="panel"><div className="panel-head"><div><h3>Accès rapides</h3><p>Actions fréquentes</p></div></div>
              <div className="quick-grid">
                <Quick icon={UserRound} label="Nouveau patient" onClick={() => setShowPatient(true)} />
                <Quick icon={CalendarDays} label="Planifier un RDV" onClick={() => setShowAppointment(true)} />
                <Quick icon={ClipboardList} label="Consultation" onClick={() => setShowConsultation(true)} />
                <Quick icon={Wallet} label="Paiement" onClick={() => setShowPayment(true)} />
              </div></section>
          </>}

          {section === 'patients' && <>
            <PageHeading title="Patients" desc="Consultez et gérez les dossiers des patients." action="Nouveau patient" onClick={() => setShowPatient(true)} />
            <section className="panel"><div className="toolbar"><div className="searchbox"><Search size={17} />
              <input placeholder="Rechercher par nom ou téléphone…" value={query} onChange={e => setQuery(e.target.value)} /></div>
              <span className="muted">{filtered.length} patient(s)</span></div>
              <PatientTable patients={filtered} onSelect={openPatient} /></section>
          </>}

          {section === 'appointments' && <>
            <PageHeading title="Rendez-vous" desc="Organisez les consultations et suivez leur statut." action="Nouveau rendez-vous" onClick={() => setShowAppointment(true)} />
            <section className="panel"><div className="panel-head"><div><h3>Liste des rendez-vous</h3><p>Planning enregistré</p></div>
              <button className="icon-btn" onClick={loadData}><RefreshCw size={17} /></button></div>
              <AppointmentList items={appointments} patients={patients} detailed /></section>
          </>}

          {section === 'consultations' && <>
            <PageHeading title="Consultations" desc="Historique médical, examens ORL, diagnostics et traitements." action="Créer une consultation" onClick={() => setShowConsultation(true)} />
            <section className="panel"><div className="panel-head"><div><h3>Historique des consultations</h3><p>{consultations.length} dossier(s)</p></div></div>
              <div className="table-wrap"><table><thead><tr><th>Date</th><th>Patient</th><th>Service</th><th>Prix</th><th>Payé</th><th>Reste</th></tr></thead><tbody>
                {consultations.map(c => { const paid = paidFor(c.id); const fee = Number(c.fee_amount || 0); return <tr key={c.id}>
                  <td>{c.consultation_date ? new Date(c.consultation_date).toLocaleDateString('fr-FR') : '—'}</td><td>{patientName(c.patient_id)}</td><td>{c.service_name || c.reason || 'Consultation ORL'}</td>
                  <td>{c.fee_amount == null ? '—' : money(fee)}</td><td>{money(paid)}</td><td>{c.fee_amount == null ? '—' : money(Math.max(0, fee - paid))}</td>
                </tr>; })}
                {!consultations.length && <tr><td colSpan="6" className="empty">Aucune consultation enregistrée.</td></tr>}
              </tbody></table></div></section>
          </>}

          {section === 'prescriptions' && <>
            <PageHeading
              title="Ordonnance"
              desc="Rédigez, enregistrez et imprimez directement une ordonnance au format A5."
            />
            <section className="panel">
              <div className="panel-head">
                <div><h3>Nouvelle ordonnance</h3><p>Sélectionnez le patient puis rédigez la prescription.</p></div>
              </div>
              <form onSubmit={savePrescription} className="form-grid">
                <Field label="Patient" wide required>
                  <select
                    required
                    value={prescriptionForm.patient_id}
                    onChange={e => setPrescriptionForm({ ...prescriptionForm, patient_id: e.target.value })}
                  >
                    <option value="">Sélectionner un patient</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.last_name} {p.first_name} — {p.phone || 'Sans téléphone'}</option>)}
                  </select>
                </Field>
                <Field label="Contenu de l’ordonnance" wide required>
                  <textarea
                    rows={12}
                    placeholder={"Exemple :\nNom du médicament — dosage\nPosologie : ...\nDurée : ..."}
                    value={prescriptionForm.content}
                    onChange={e => setPrescriptionForm({ ...prescriptionForm, content: e.target.value })}
                  />
                </Field>
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setPrescriptionForm({ patient_id: '', content: '' })}>Effacer</button>
                  <button className="primary" disabled={saving || demo}>
                    <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer et préparer l’impression'}
                  </button>
                </div>
                {demo && <p className="muted field wide">Le mode aperçu ne permet pas d’enregistrer. Connectez Supabase pour utiliser cette fonction.</p>}
              </form>
            </section>

            <section className="panel">
              <div className="panel-head"><div><h3>Ordonnances récentes</h3><p>{prescriptions.length} ordonnance(s) enregistrée(s)</p></div></div>
              <div className="table-wrap"><table><thead><tr><th>Date</th><th>Patient</th><th>Contenu</th><th></th></tr></thead><tbody>
                {prescriptions.map(rx => <tr key={rx.id}>
                  <td>{rx.created_at ? new Date(rx.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>{patientName(rx.patient_id)}</td>
                  <td>{(rx.content || '').slice(0, 90)}{(rx.content || '').length > 90 ? '…' : ''}</td>
                  <td><button type="button" className="icon-btn" onClick={() => setPrintingPrescription({ ...rx, patient: patients.find(p => p.id === rx.patient_id) || null })}><Printer size={16} /> Imprimer</button></td>
                </tr>)}
                {!prescriptions.length && <tr><td colSpan="4" className="empty">Aucune ordonnance enregistrée.</td></tr>}
              </tbody></table></div>
            </section>
          </>}

          {section === 'billing' && <>
            <PageHeading title="Facturation" desc="Honoraires, paiements et suivi des règlements." action="Ajouter un paiement" onClick={() => setShowPayment(true)} />
            <div className="stats-grid"><Stat icon={Wallet} label="Total encaissé" value={money(totalPayments)} tone="gold" />
              <Stat icon={FileHeart} label="Consultations facturées" value={consultations.filter(c => c.fee_amount != null).length} tone="violet" /></div>
            <section className="panel"><div className="panel-head"><div><h3>Historique des paiements</h3><p>Montants en dinars algériens</p></div></div>
              <div className="table-wrap"><table><thead><tr><th>Date</th><th>Patient</th><th>Montant</th><th>Méthode</th><th>Note</th></tr></thead><tbody>
                {payments.map(p => <tr key={p.id}><td>{p.payment_date}</td><td>{patientName(p.patient_id)}</td><td>{money(p.amount)}</td><td>{p.payment_method || '—'}</td><td>{p.notes || '—'}</td></tr>)}
                {!payments.length && <tr><td colSpan="5" className="empty">Aucun paiement enregistré.</td></tr>}
              </tbody></table></div></section>
          </>}

          {section === 'reports' && <>
            <PageHeading title="Statistiques" desc="Activité et recettes du cabinet." />
            <div className="stats-grid"><Stat icon={Users} label="Patients" value={patients.length} tone="blue" />
              <Stat icon={FileHeart} label="Consultations" value={consultations.length} tone="violet" />
              <Stat icon={Wallet} label="Recettes encaissées" value={money(totalPayments)} tone="gold" /></div>
          </>}

          {section === 'settings' && <>
            <PageHeading title="Paramètres" desc="Configuration du cabinet." />
            <section className="panel"><h3>Informations du cabinet</h3><p>Cabinet ORL — Dr M. SOUFIEN</p><p>Devise utilisée : Dinar algérien (DA)</p></section>
          </>}

          <footer>© {new Date().getFullYear()} CABINET ORL — Dr M. SOUFIEN • Espace médical confidentiel</footer>
        </div>
      </main>

      {/* NOUVEAU PATIENT */}
      {showPatient && (
        <Modal
          title="Nouveau patient"
          close={() => setShowPatient(false)}
        >
          <form onSubmit={savePatient} className="form-grid">
            <Field label="Nom" required>
              <input
                required
                value={patientForm.last_name}
                onChange={e => setPatientForm({
                  ...patientForm,
                  last_name: e.target.value
                })}
              />
            </Field>

            <Field label="Prénom" required>
              <input
                required
                value={patientForm.first_name}
                onChange={e => setPatientForm({
                  ...patientForm,
                  first_name: e.target.value
                })}
              />
            </Field>

            <Field label="Téléphone">
              <input
                value={patientForm.phone}
                onChange={e => setPatientForm({
                  ...patientForm,
                  phone: e.target.value
                })}
              />
            </Field>

            <Field label="Date de naissance">
              <input
                type="date"
                value={patientForm.birth_date}
                onChange={e => setPatientForm({
                  ...patientForm,
                  birth_date: e.target.value
                })}
              />
            </Field>

            <Field label="Sexe">
              <select
                value={patientForm.sex}
                onChange={e => setPatientForm({
                  ...patientForm,
                  sex: e.target.value
                })}
              >
                <option value="">Non renseigné</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </Field>

            <Field label="Adresse">
              <input
                value={patientForm.address}
                onChange={e => setPatientForm({
                  ...patientForm,
                  address: e.target.value
                })}
              />
            </Field>

            <Field label="Notes administratives" wide>
              <textarea
                value={patientForm.notes}
                onChange={e => setPatientForm({
                  ...patientForm,
                  notes: e.target.value
                })}
              />
            </Field>

            <FormActions
              close={() => setShowPatient(false)}
              label={saving ? 'Enregistrement…' : 'Enregistrer le patient'}
            />
          </form>
        </Modal>
      )}

      {/* NOUVEAU RENDEZ-VOUS */}
      {showAppointment && (
        <Modal
          title="Nouveau rendez-vous"
          close={() => setShowAppointment(false)}
        >
          <form onSubmit={saveAppointment} className="form-grid">
            <Field label="Patient" wide required>
              <select
                required
                value={appointmentForm.patient_id}
                onChange={e => setAppointmentForm({
                  ...appointmentForm,
                  patient_id: e.target.value
                })}
              >
                <option value="">Sélectionner un patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.last_name} {p.first_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date" required>
              <input
                type="date"
                required
                value={appointmentForm.appointment_date}
                onChange={e => setAppointmentForm({
                  ...appointmentForm,
                  appointment_date: e.target.value
                })}
              />
            </Field>

            <Field label="Heure" required>
              <input
                type="time"
                required
                value={appointmentForm.appointment_time}
                onChange={e => setAppointmentForm({
                  ...appointmentForm,
                  appointment_time: e.target.value
                })}
              />
            </Field>

            <Field label="Motif" wide>
              <input
                value={appointmentForm.reason}
                onChange={e => setAppointmentForm({
                  ...appointmentForm,
                  reason: e.target.value
                })}
              />
            </Field>

            <FormActions
              close={() => setShowAppointment(false)}
              label="Enregistrer le rendez-vous"
            />
          </form>
        </Modal>
      )}

      {/* NOUVELLE CONSULTATION */}
      {showConsultation && (
        <Modal
          title="Nouvelle consultation"
          close={() => setShowConsultation(false)}
        >
          <form onSubmit={saveConsultation} className="form-grid">
            <Field label="Patient" wide required>
              <select
                required
                value={consultationForm.patient_id}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  patient_id: e.target.value
                })}
              >
                <option value="">Sélectionner un patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.last_name} {p.first_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Service médical" wide required>
              <select
                required
                value={consultationForm.service_name}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  service_name: e.target.value
                })}
              >
                {SERVICES.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Prix en DA">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Saisir le prix"
                value={consultationForm.fee_amount}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  fee_amount: e.target.value
                })}
              />
            </Field>

            <Field label="Motif" wide>
              <textarea
                value={consultationForm.reason}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  reason: e.target.value
                })}
              />
            </Field>

            <Field label="Antécédents / Histoire" wide>
              <textarea
                value={consultationForm.history}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  history: e.target.value
                })}
              />
            </Field>

            <Field label="Examen clinique" wide>
              <textarea
                value={consultationForm.clinical_exam}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  clinical_exam: e.target.value
                })}
              />
            </Field>

            <Field label="Examen ORL" wide>
              <textarea
                value={consultationForm.orl_exam}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  orl_exam: e.target.value
                })}
              />
            </Field>

            <Field label="Diagnostic" wide>
              <textarea
                value={consultationForm.diagnosis}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  diagnosis: e.target.value
                })}
              />
            </Field>

            <Field label="Traitement" wide>
              <textarea
                value={consultationForm.treatment}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  treatment: e.target.value
                })}
              />
            </Field>

            <Field label="Ordonnance" wide>
              <textarea
                value={consultationForm.prescription}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  prescription: e.target.value
                })}
              />
            </Field>

            <Field label="Suivi / Prochain contrôle" wide>
              <textarea
                value={consultationForm.follow_up}
                onChange={e => setConsultationForm({
                  ...consultationForm,
                  follow_up: e.target.value
                })}
              />
            </Field>

            <FormActions
              close={() => setShowConsultation(false)}
              label={saving ? 'Enregistrement…' : 'Enregistrer la consultation'}
            />
          </form>
        </Modal>
      )}

      {/* PAIEMENT */}
      {showPayment && (
        <Modal
          title="Enregistrer un paiement"
          close={() => setShowPayment(false)}
        >
          <form onSubmit={savePayment} className="form-grid">
            <Field label="Patient" wide required>
              <select
                required
                value={paymentForm.patient_id}
                onChange={e => setPaymentForm({
                  ...paymentForm,
                  patient_id: e.target.value,
                  consultation_id: ''
                })}
              >
                <option value="">Sélectionner un patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.last_name} {p.first_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Consultation liée" wide>
              <select
                value={paymentForm.consultation_id}
                onChange={e => setPaymentForm({
                  ...paymentForm,
                  consultation_id: e.target.value
                })}
              >
                <option value="">
                  Paiement non lié à une consultation
                </option>

                {consultations
                  .filter(c => c.patient_id === paymentForm.patient_id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.service_name || 'Consultation'} —{' '}
                      {new Date(c.consultation_date)
                        .toLocaleDateString('fr-FR')}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Montant en DA" required>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={e => setPaymentForm({
                  ...paymentForm,
                  amount: e.target.value
                })}
              />
            </Field>

            <Field label="Date du paiement" required>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={e => setPaymentForm({
                  ...paymentForm,
                  payment_date: e.target.value
                })}
              />
            </Field>

            <Field label="Mode de paiement">
              <select
                value={paymentForm.payment_method}
                onChange={e => setPaymentForm({
                  ...paymentForm,
                  payment_method: e.target.value
                })}
              >
                <option>Espèces</option>
                <option>Carte bancaire</option>
                <option>Virement</option>
                <option>Autre</option>
              </select>
            </Field>

            <Field label="Note" wide>
              <textarea
                value={paymentForm.notes}
                onChange={e => setPaymentForm({
                  ...paymentForm,
                  notes: e.target.value
                })}
              />
            </Field>

            <FormActions
              close={() => setShowPayment(false)}
              label="Enregistrer le paiement"
            />
          </form>
        </Modal>
      )}

      {/* DOSSIER PATIENT ET HISTORIQUE MÉDICAL */}
      {selectedPatient && (
        <Modal
          title="Dossier patient"
          close={() => {
            setSelectedPatient(null);
            setSelectedConsultation(null);
            setEditingPatient(false);
            setEditingConsultation(false);
          }}
        >
          {selectedConsultation ? (
            <div className="medical-detail">
              <button
                className="text-btn"
                onClick={() => {
                  setSelectedConsultation(null);
                  setEditingConsultation(false);
                }}
              >
                ← Retour au dossier patient
              </button>

              <h2>
                {selectedConsultation.service_name || 'Consultation ORL'}
              </h2>

              <p className="muted">
                {selectedConsultation.consultation_date
                  ? new Date(selectedConsultation.consultation_date)
                      .toLocaleString('fr-FR')
                  : 'Date non renseignée'}
              </p>

              {editingConsultation ? (
                <form
                  onSubmit={updateConsultation}
                  className="form-grid"
                >
                  <Field label="Service médical" wide>
                    <select
                      value={consultationForm.service_name}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        service_name: e.target.value
                      })}
                    >
                      {SERVICES.map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Prix en DA">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={consultationForm.fee_amount}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        fee_amount: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Motif" wide>
                    <textarea
                      value={consultationForm.reason}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        reason: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Antécédents / Histoire" wide>
                    <textarea
                      value={consultationForm.history}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        history: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Examen clinique" wide>
                    <textarea
                      value={consultationForm.clinical_exam}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        clinical_exam: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Examen ORL" wide>
                    <textarea
                      value={consultationForm.orl_exam}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        orl_exam: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Diagnostic" wide>
                    <textarea
                      value={consultationForm.diagnosis}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        diagnosis: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Traitement" wide>
                    <textarea
                      value={consultationForm.treatment}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        treatment: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Ordonnance" wide>
                    <textarea
                      value={consultationForm.prescription}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        prescription: e.target.value
                      })}
                    />
                  </Field>

                  <Field label="Suivi / Prochain contrôle" wide>
                    <textarea
                      value={consultationForm.follow_up}
                      onChange={e => setConsultationForm({
                        ...consultationForm,
                        follow_up: e.target.value
                      })}
                    />
                  </Field>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditingConsultation(false)}
                    >
                      Annuler
                    </button>
                    <button className="primary" disabled={saving}>
                      <Save size={16} />
                      Enregistrer les modifications
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <Detail label="Motif" value={selectedConsultation.reason} />
                  <Detail label="Antécédents / Histoire" value={selectedConsultation.history} />
                  <Detail label="Examen clinique" value={selectedConsultation.clinical_exam} />
                  <Detail label="Examen ORL" value={selectedConsultation.orl_exam} />
                  <Detail label="Diagnostic" value={selectedConsultation.diagnosis} />
                  <Detail label="Traitement" value={selectedConsultation.treatment} />
                  <Detail label="Ordonnance" value={selectedConsultation.prescription} />
                  <Detail label="Suivi" value={selectedConsultation.follow_up} />
                  <Detail
                    label="Prix"
                    value={selectedConsultation.fee_amount == null
                      ? '—'
                      : money(selectedConsultation.fee_amount)}
                  />

                  <button
                    className="primary full"
                    onClick={startEditConsultation}
                  >
                    <Pencil size={17} />
                    Modifier cette consultation
                  </button>
                </>
              )}
            </div>
          ) : editingPatient ? (
            <form onSubmit={updatePatient} className="form-grid">
              <Field label="Nom" required>
                <input
                  required
                  value={patientForm.last_name}
                  onChange={e => setPatientForm({
                    ...patientForm,
                    last_name: e.target.value
                  })}
                />
              </Field>

              <Field label="Prénom" required>
                <input
                  required
                  value={patientForm.first_name}
                  onChange={e => setPatientForm({
                    ...patientForm,
                    first_name: e.target.value
                  })}
                />
              </Field>

              <Field label="Téléphone">
                <input
                  value={patientForm.phone}
                  onChange={e => setPatientForm({
                    ...patientForm,
                    phone: e.target.value
                  })}
                />
              </Field>

              <Field label="Date de naissance">
                <input
                  type="date"
                  value={patientForm.birth_date}
                  onChange={e => setPatientForm({
                    ...patientForm,
                    birth_date: e.target.value
                  })}
                />
              </Field>

              <Field label="Sexe">
                <select
                  value={patientForm.sex}
                  onChange={e => setPatientForm({
                    ...patientForm,
                    sex: e.target.value
                  })}
                >
                  <option value="">Non renseigné</option>
                  <option value="F">Féminin</option>
                  <option value="M">Masculin</option>
                </select>
              </Field>

              <Field label="Adresse" wide>
                <input
                  value={patientForm.address}
                  onChange={e => setPatientForm({
                    ...patientForm,
                    address: e.target.value
                  })}
                />
              </Field>

              <Field label="Notes administratives" wide>
                <textarea
                  value={patientForm.notes}
                  onChange={e => setPatientForm({
                    ...patientForm,
                    notes: e.target.value
                  })}
                />
              </Field>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditingPatient(false)}
                >
                  Annuler
                </button>
                <button className="primary" disabled={saving}>
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          ) : (
            <div className="patient-detail">
              <div className="detail-avatar">
                {selectedPatient.first_name?.[0]}
                {selectedPatient.last_name?.[0]}
              </div>

              <h2>
                {selectedPatient.last_name} {selectedPatient.first_name}
              </h2>

              <p>{selectedPatient.phone || 'Téléphone non renseigné'}</p>

              <div className="detail-row">
                <span>Date de naissance</span>
                <b>{selectedPatient.birth_date || '—'}</b>
              </div>

              <div className="detail-row">
                <span>Sexe</span>
                <b>
                  {selectedPatient.sex === 'F'
                    ? 'Féminin'
                    : selectedPatient.sex === 'M'
                      ? 'Masculin'
                      : '—'}
                </b>
              </div>

              <div className="detail-row">
                <span>Adresse</span>
                <b>{selectedPatient.address || '—'}</b>
              </div>

              <div className="detail-row">
                <span>Notes</span>
                <b>{selectedPatient.notes || '—'}</b>
              </div>

              <button
                className="secondary full"
                onClick={startEditPatient}
              >
                <Pencil size={16} />
                Modifier le dossier patient
              </button>

              <div className="history-heading">
                <History size={19} />
                <h3>Historique médical</h3>
              </div>

              <p className="muted">
                {patientHistory.length} consultation(s) enregistrée(s)
              </p>

              {patientHistory.map(c => (
                <button
                  className="history-card"
                  key={c.id}
                  onClick={() => openConsultation(c)}
                >
                  <div>
                    <b>{c.service_name || 'Consultation ORL'}</b>
                    <span>
                      {c.consultation_date
                        ? new Date(c.consultation_date)
                            .toLocaleDateString('fr-FR')
                        : 'Date non renseignée'}
                    </span>
                    <small>
                      Diagnostic : {c.diagnosis || 'Non renseigné'}
                    </small>
                  </div>
                  <ChevronRight size={20} />
                </button>
              ))}

              {!patientHistory.length && (
                <div className="empty-block">
                  Aucune consultation précédente pour ce patient.
                </div>
              )}

              <button
                className="primary full"
                onClick={() => {
                  setConsultationForm({
                    ...emptyConsultation,
                    patient_id: selectedPatient.id
                  });
                  setShowConsultation(true);
                }}
              >
                <Plus size={17} />
                Nouvelle consultation pour ce patient
              </button>
            </div>
          )}
        </Modal>
      )}

      {printingPrescription && (
        <div className="prescription-print-overlay">
          <div className="prescription-print-actions">
            <button className="secondary" onClick={() => setPrintingPrescription(null)}>Fermer</button>
            <button className="primary" onClick={() => window.print()}><Printer size={17} /> Imprimer l’ordonnance A5</button>
          </div>
          <article id="print-prescription" className="prescription-paper">
            <header className="prescription-header">
              <div>
                <h1>Dr. MOKHTARI SOFIANE</h1>
                <h2>Médecin Spécialiste en ORL</h2>
                <p>Nasofibroscopie / Audiométrie<br />Impédancemétrie / Allergologie</p>
              </div>
              <img src="/assets/icon-foreground.png" alt="Logo Cabinet ORL" />
            </header>
            <div className="prescription-meta">
              <div><b>Date :</b> {new Date(printingPrescription.created_at || Date.now()).toLocaleDateString('fr-FR')}</div>
              <div><b>Nom et Prénom :</b> {printingPrescription.patient ? `${printingPrescription.patient.last_name} ${printingPrescription.patient.first_name}` : patientName(printingPrescription.patient_id)}</div>
              <div><b>Âge :</b> {printingPrescription.patient?.birth_date ? `${Math.floor((Date.now() - new Date(printingPrescription.patient.birth_date).getTime()) / 31557600000)} ans` : '—'}</div>
            </div>
            <div className="prescription-title">Ordonnance</div>
            <div className="prescription-content">{printingPrescription.content}</div>
            <footer className="prescription-footer">
              <span>☎ 05 42 47 35 02</span>
              <span>⌖ 20 Cité les Costors, T.U.O Maraval, Oran</span>
              <span>✉ Dr.mokhtari.s.orl@gmail.com</span>
            </footer>
          </article>
          <style>{`
            .prescription-print-overlay{position:fixed;inset:0;z-index:10000;background:rgba(10,25,32,.72);overflow:auto;padding:18px;display:flex;flex-direction:column;align-items:center;gap:14px}
            .prescription-print-actions{display:flex;gap:10px;justify-content:center;position:sticky;top:0;z-index:2}
            .prescription-paper{box-sizing:border-box;background:#fff;color:#17212b;width:148mm;min-height:210mm;padding:12mm 11mm 10mm;font-family:Arial,sans-serif;display:flex;flex-direction:column;box-shadow:0 8px 35px #0005}
            .prescription-header{display:flex;justify-content:space-between;gap:8mm;align-items:flex-start;border-bottom:1px solid #333;padding-bottom:5mm}
            .prescription-header h1{font-size:17pt;margin:0 0 2mm;font-weight:700}
            .prescription-header h2{font-size:12pt;margin:0 0 2mm}
            .prescription-header p{font-size:9pt;line-height:1.4;margin:0}
            .prescription-header img{width:25mm;height:25mm;object-fit:contain}
            .prescription-meta{font-size:10pt;line-height:2.1;padding:5mm 0 3mm;border-bottom:1px solid #333}
            .prescription-title{text-align:center;font-size:21pt;font-weight:700;margin:4mm 0 8mm}
            .prescription-content{white-space:pre-wrap;font-size:12pt;line-height:1.65;flex:1}
            .prescription-footer{border-top:1px solid #333;padding-top:3mm;margin-top:8mm;display:flex;justify-content:space-between;gap:3mm;font-size:7pt;flex-wrap:wrap}
            @media print{
              @page{size:A5 portrait;margin:0}
              body *{visibility:hidden!important}
              #print-prescription,#print-prescription *{visibility:visible!important}
              #print-prescription{position:absolute;left:0;top:0;width:148mm;min-height:210mm;margin:0;box-shadow:none}
              .prescription-print-overlay{position:static!important;display:block!important;padding:0!important;background:#fff!important;overflow:visible!important}
              .prescription-print-actions{display:none!important}
            }
          `}</style>
        </div>
      )}

    </div>
  );
}

// COMPOSANTS
function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Quick({ icon: Icon, label, onClick }) {
  return (
    <button className="quick" onClick={onClick}>
      <span><Icon size={20} /></span>
      <b>{label}</b>
      <ArrowUpRight size={15} />
    </button>
  );
}

function PageHeading({ title, desc, action, onClick }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">GESTION DU CABINET</p>
        <h1>{title}</h1>
        <p className="muted">{desc}</p>
      </div>
      {action && (
        <button className="primary" onClick={onClick}>
          <Plus size={17} />
          {action}
        </button>
      )}
    </div>
  );
}

function Field({ label, children, wide, required }) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      {label}{required && <em> *</em>}
      {children}
    </label>
  );
}

function FormActions({ close, label }) {
  return (
    <div className="form-actions">
      <button
        type="button"
        className="secondary"
        onClick={close}
      >
        Annuler
      </button>
      <button className="primary">
        {label}
      </button>
    </div>
  );
}

function Modal({ title, close, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="medical-detail-row">
      <b>{label}</b>
      <p>{value || 'Non renseigné'}</p>
    </div>
  );
}

function PatientTable({ patients, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Téléphone</th>
            <th>Date de naissance</th>
            <th>Sexe</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr
              key={p.id}
              onClick={() => onSelect(p)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <div className="person">
                  <div className="person-avatar">
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </div>
                  <b>{p.last_name} {p.first_name}</b>
                </div>
              </td>
              <td>{p.phone || '—'}</td>
              <td>{p.birth_date || '—'}</td>
              <td>
                {p.sex === 'F'
                  ? 'Féminin'
                  : p.sex === 'M'
                    ? 'Masculin'
                    : '—'}
              </td>
              <td><ArrowUpRight size={16} /></td>
            </tr>
          ))}

          {!patients.length && (
            <tr>
              <td colSpan="5" className="empty">
                Aucun patient trouvé.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AppointmentList({ items, patients, detailed }) {
  return (
    <div className="appointment-list">
      {items.map(a => {
        const p = a.patients ||
          patients.find(x => x.id === a.patient_id) || {};

        return (
          <div className="appointment-row" key={a.id}>
            <div className="time">
              <Clock size={15} />
              {a.appointment_time || '—'}
            </div>

            <div className="appointment-person">
              <b>{p.last_name || 'Patient'} {p.first_name || ''}</b>
              <span>
                {a.reason || 'Consultation ORL'}
                {detailed && ` • ${a.appointment_date || ''}`}
              </span>
            </div>

            <span className={`status ${a.status || 'scheduled'}`}>
              {a.status === 'completed'
                ? 'Terminé'
                : a.status === 'cancelled'
                  ? 'Annulé'
                  : 'Confirmé'}
            </span>
          </div>
        );
      })}

      {!items.length && (
        <div className="empty-block">
          Aucun rendez-vous enregistré.
        </div>
      )}
    </div>
  );
}
