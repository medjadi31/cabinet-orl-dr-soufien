import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, CalendarDays, Users, FileHeart, Wallet,
  ChartNoAxesCombined, Settings, Search, Plus, LogOut,
  Menu, X, Stethoscope, Clock, CheckCircle2, AlertCircle,
  UserRound, ClipboardList, ArrowUpRight, RefreshCw
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

const demoPatients = [
  { id: 'demo-1', first_name: 'Nadia', last_name: 'B.', phone: '0550 00 00 01' },
  { id: 'demo-2', first_name: 'Karim', last_name: 'A.', phone: '0661 00 00 02' }
];

const nav = [
  ['dashboard', 'Tableau de bord', Activity],
  ['patients', 'Patients', Users],
  ['appointments', 'Rendez-vous', CalendarDays],
  ['consultations', 'Consultations', FileHeart],
  ['billing', 'Facturation', Wallet],
  ['reports', 'Statistiques', ChartNoAxesCombined],
  ['settings', 'Paramètres', Settings]
];

const today = () => new Date().toISOString().slice(0, 10);
const money = value =>
  `${Number(value || 0).toLocaleString('fr-FR')} DA`;

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [section, setSection] = useState('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [patients, setPatients] = useState(demoPatients);
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [payments, setPayments] = useState([]);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const [showPatient, setShowPatient] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [patientForm, setPatientForm] = useState({
    first_name: '', last_name: '', phone: '',
    birth_date: '', sex: '', address: '', notes: ''
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '', appointment_date: today(),
    appointment_time: '09:00', reason: '', status: 'scheduled'
  });

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

  const [consultationForm, setConsultationForm] =
    useState(emptyConsultation);

  const [paymentForm, setPaymentForm] = useState({
    patient_id: '',
    consultation_id: '',
    amount: '',
    payment_method: 'Espèces',
    payment_date: today(),
    notes: ''
  });

  const demo = !supabase;

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, value) => {
        setSession(value);
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  useEffect(() => {
    if (!supabase || !session) return;

    const channel = supabase
      .channel('clinic-live-sync')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'patients'
      }, loadData)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments'
      }, loadData)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'consultations'
      }, loadData)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'payments'
      }, loadData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  async function loadData() {
    if (!supabase || !session) return;

    setError('');

    try {
      const [p, a, c, b] = await Promise.all([
        supabase.from('patients').select('*')
          .order('created_at', { ascending: false }),
        supabase.from('appointments').select('*, patients(first_name,last_name)')
          .order('appointment_date'),
        supabase.from('consultations').select('*')
          .order('consultation_date', { ascending: false }),
        supabase.from('payments').select('*')
          .order('payment_date', { ascending: false })
      ]);

      for (const result of [p, a, c, b]) {
        if (result.error) throw result.error;
      }

      setPatients(p.data || []);
      setAppointments(a.data || []);
      setConsultations(c.data || []);
      setPayments(b.data || []);
    } catch (e) {
      setError(e.message || 'Erreur de chargement');
    }
  }

  async function signIn(e) {
    e.preventDefault();
    setError('');
    const { error } =
      await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function savePatient(e) {
    e.preventDefault();
    setError('');

    if (demo) {
      setPatients(old => [{
        ...patientForm,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }, ...old]);
    } else {
      const { error } =
        await supabase.from('patients').insert(patientForm);
      if (error) return setError(error.message);
      await loadData();
    }

    setShowPatient(false);
    setPatientForm({
      first_name: '', last_name: '', phone: '',
      birth_date: '', sex: '', address: '', notes: ''
    });
    setNotice('Patient enregistré.');
  }

  async function saveAppointment(e) {
    e.preventDefault();
    setError('');

    if (!appointmentForm.patient_id) {
      return setError('Veuillez sélectionner un patient.');
    }

    if (demo) {
      const p = patients.find(x => x.id === appointmentForm.patient_id);
      setAppointments(old => [{
        ...appointmentForm,
        id: crypto.randomUUID(),
        patients: { first_name: p.first_name, last_name: p.last_name }
      }, ...old]);
    } else {
      const { error } =
        await supabase.from('appointments').insert(appointmentForm);
      if (error) return setError(error.message);
      await loadData();
    }

    setShowAppointment(false);
    setNotice('Rendez-vous enregistré.');
  }

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

    const record = {
      ...consultationForm,
      fee_amount: fee,
      consultation_date: new Date().toISOString()
    };

    if (demo) {
      setConsultations(old => [{
        ...record,
        id: crypto.randomUUID()
      }, ...old]);
    } else {
      const { error } = await supabase
        .from('consultations')
        .insert({
          ...record,
          created_by: session.user.id
        });

      if (error) return setError(error.message);
      await loadData();
    }

    setShowConsultation(false);
    setConsultationForm(emptyConsultation);
    setNotice('Consultation enregistrée.');
  }

  async function savePayment(e) {
    e.preventDefault();
    setError('');

    const amount = Number(paymentForm.amount);

    if (!paymentForm.patient_id || !paymentForm.amount ||
        !Number.isFinite(amount) || amount <= 0) {
      return setError('Veuillez sélectionner un patient et saisir un montant valide.');
    }

    const record = {
      ...paymentForm,
      amount,
      currency: 'DZD',
      consultation_id: paymentForm.consultation_id || null
    };

    if (demo) {
      setPayments(old => [{
        ...record,
        id: crypto.randomUUID()
      }, ...old]);
    } else {
      const { error } =
        await supabase.from('payments').insert(record);
      if (error) return setError(error.message);
      await loadData();
    }

    setShowPayment(false);
    setPaymentForm({
      patient_id: '', consultation_id: '',
      amount: '', payment_method: 'Espèces',
      payment_date: today(), notes: ''
    });
    setNotice('Paiement enregistré.');
  }

  const filtered = useMemo(() =>
    patients.filter(p =>
      `${p.first_name} ${p.last_name} ${p.phone || ''}`
        .toLowerCase().includes(query.toLowerCase())
    ), [patients, query]);

  const todayAppointments =
    appointments.filter(a => a.appointment_date === today());

  const totalPayments =
    payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  function paidFor(consultationId) {
    return payments
      .filter(p => p.consultation_id === consultationId)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  function patientName(id) {
    const p = patients.find(x => x.id === id);
    return p ? `${p.last_name} ${p.first_name}` : 'Patient';
  }

  if (authLoading) {
    return <div className="center">Chargement sécurisé…</div>;
  }

  if (supabase && !session) {
    return (
      <div className="login-wrap">
        <form className="login-card" onSubmit={signIn}>
          <div className="brand-mark"><Stethoscope size={28}/></div>
          <p className="eyebrow">ESPACE PROFESSIONNEL</p>
          <h1>CABINET ORL</h1>
          <h2>Dr M. SOUFIEN</h2>
          <p className="muted">Connectez-vous à votre espace médical.</p>
          {error && <div className="error">{error}</div>}
          <label>Email professionnel
            <input type="email" required value={email}
              onChange={e => setEmail(e.target.value)}/>
          </label>
          <label>Mot de passe
            <input type="password" required value={password}
              onChange={e => setPassword(e.target.value)}/>
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
          <div className="brand-mark"><Stethoscope size={25}/></div>
          <div><b>CABINET ORL</b><span>Dr M. SOUFIEN</span></div>
          <button className="close-nav" onClick={() => setMobileNav(false)}><X/></button>
        </div>

        <div className="side-label">MENU PRINCIPAL</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id}
              className={section === id ? 'nav-item active' : 'nav-item'}
              onClick={() => { setSection(id); setMobileNav(false); }}>
              <Icon size={18}/><span>{label}</span>
              {id === 'appointments' && todayAppointments.length > 0 &&
                <i>{todayAppointments.length}</i>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure">
            <CheckCircle2 size={16}/>
            <span>Données protégées<br/><small>Connexion sécurisée</small></span>
          </div>
          <button className="nav-item" onClick={demo
            ? () => setNotice('Mode démonstration.')
            : signOut}>
            <LogOut size={18}/>Déconnexion
          </button>
        </div>
      </aside>

      {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>}

      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileNav(true)}><Menu/></button>
          <div>
            <div className="crumb">CABINET / <b>{nav.find(n => n[0] === section)?.[1].toUpperCase()}</b></div>
            <div className="top-sub">Gestion médicale et administrative</div>
          </div>
          <div className="top-actions">
            <span className="today">{new Date().toLocaleDateString('fr-FR')}</span>
            <div className="avatar">DS</div>
          </div>
        </header>

        <div className="content">
          {demo && <div className="demo-banner">
            <AlertCircle size={17}/>
            <span><b>Mode aperçu</b> — données fictives, aucune sauvegarde en ligne.</span>
          </div>}

          {error && <div className="error inline-error">{error}</div>}
          {notice && <div className="success" onClick={() => setNotice('')}>
            {notice} <button>×</button>
          </div>}

          {section === 'dashboard' && <>
            <div className="page-heading">
              <div><p className="eyebrow">VUE D’ENSEMBLE</p>
                <h1>Tableau de bord</h1>
                <p className="muted">Bienvenue dans votre espace de gestion, Docteur.</p>
              </div>
              <button className="primary" onClick={() => setShowAppointment(true)}>
                <Plus size={17}/> Nouveau rendez-vous
              </button>
            </div>

            <div className="stats-grid">
              <Stat icon={Users} label="Patients enregistrés" value={patients.length} tone="blue"/>
              <Stat icon={CalendarDays} label="RDV aujourd’hui" value={todayAppointments.length} tone="green"/>
              <Stat icon={FileHeart} label="Consultations" value={consultations.length} tone="violet"/>
              <Stat icon={Wallet} label="Encaissements" value={money(totalPayments)} tone="gold"/>
            </div>

            <section className="panel">
              <div className="panel-head">
                <div><h3>Prochains rendez-vous</h3><p>Planning du cabinet</p></div>
                <button className="text-btn" onClick={() => setSection('appointments')}>Voir tout <ArrowUpRight size={15}/></button>
              </div>
              <AppointmentList items={appointments.slice(0, 5)} patients={patients}/>
            </section>

            <section className="panel">
              <div className="panel-head"><div><h3>Accès rapides</h3><p>Actions fréquentes</p></div></div>
              <div className="quick-grid">
                <Quick icon={UserRound} label="Nouveau patient" onClick={() => setShowPatient(true)}/>
                <Quick icon={CalendarDays} label="Planifier un RDV" onClick={() => setShowAppointment(true)}/>
                <Quick icon={ClipboardList} label="Consultation" onClick={() => setShowConsultation(true)}/>
                <Quick icon={Wallet} label="Paiement" onClick={() => setShowPayment(true)}/>
              </div>
            </section>
          </>}

          {section === 'patients' && <>
            <PageHeading title="Patients" desc="Consultez et gérez les dossiers des patients."
              action="Nouveau patient" onClick={() => setShowPatient(true)}/>
            <section className="panel">
              <div className="toolbar">
                <div className="searchbox"><Search size={17}/>
                  <input placeholder="Rechercher par nom ou téléphone…"
                    value={query} onChange={e => setQuery(e.target.value)}/>
                </div>
                <span className="muted">{filtered.length} patient(s)</span>
              </div>
              <PatientTable patients={filtered} onSelect={setSelectedPatient}/>
            </section>
          </>}

          {section === 'appointments' && <>
            <PageHeading title="Rendez-vous" desc="Organisez les consultations et suivez leur statut."
              action="Nouveau rendez-vous" onClick={() => setShowAppointment(true)}/>
            <section className="panel">
              <div className="panel-head">
                <div><h3>Liste des rendez-vous</h3><p>Planning enregistré</p></div>
                <button className="icon-btn" onClick={loadData}><RefreshCw size={17}/></button>
              </div>
              <AppointmentList items={appointments} patients={patients} detailed/>
            </section>
          </>}

          {section === 'consultations' && <>
            <PageHeading title="Consultations"
              desc="Historique médical, examens ORL, diagnostics et traitements."
              action="Créer une consultation" onClick={() => setShowConsultation(true)}/>
            <section className="panel">
              <div className="panel-head">
                <div><h3>Historique des consultations</h3><p>{consultations.length} dossier(s)</p></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Date</th><th>Patient</th><th>Service</th><th>Prix</th><th>Payé</th><th>Reste</th>
                  </tr></thead>
                  <tbody>
                    {consultations.map(c => {
                      const paid = paidFor(c.id);
                      const fee = Number(c.fee_amount || 0);
                      return <tr key={c.id}>
                        <td>{new Date(c.consultation_date).toLocaleDateString('fr-FR')}</td>
                        <td>{patientName(c.patient_id)}</td>
                        <td>{c.service_name || c.reason || 'Consultation ORL'}</td>
                        <td>{c.fee_amount == null ? '—' : money(fee)}</td>
                        <td>{money(paid)}</td>
                        <td>{c.fee_amount == null ? '—' : money(Math.max(0, fee - paid))}</td>
                      </tr>;
                    })}
                    {!consultations.length && <tr><td colSpan="6" className="empty">Aucune consultation enregistrée.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>}

          {section === 'billing' && <>
            <PageHeading title="Facturation"
              desc="Honoraires, paiements et suivi des règlements."
              action="Ajouter un paiement" onClick={() => setShowPayment(true)}/>
            <div className="stats-grid">
              <Stat icon={Wallet} label="Total encaissé" value={money(totalPayments)} tone="gold"/>
              <Stat icon={FileHeart} label="Consultations facturées"
                value={consultations.filter(c => c.fee_amount != null).length} tone="violet"/>
            </div>
            <section className="panel">
              <div className="panel-head"><div><h3>Historique des paiements</h3><p>Montants en dinars algériens</p></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Patient</th><th>Montant</th><th>Méthode</th><th>Note</th></tr></thead>
                  <tbody>
                    {payments.map(p => <tr key={p.id}>
                      <td>{p.payment_date}</td>
                      <td>{patientName(p.patient_id)}</td>
                      <td>{money(p.amount)}</td>
                      <td>{p.payment_method || '—'}</td>
                      <td>{p.notes || '—'}</td>
                    </tr>)}
                    {!payments.length && <tr><td colSpan="5" className="empty">Aucun paiement enregistré.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>}

          {section === 'reports' && <>
            <PageHeading title="Statistiques" desc="Activité et recettes du cabinet."/>
            <div className="stats-grid">
              <Stat icon={Users} label="Patients" value={patients.length} tone="blue"/>
              <Stat icon={FileHeart} label="Consultations" value={consultations.length} tone="violet"/>
              <Stat icon={Wallet} label="Recettes encaissées" value={money(totalPayments)} tone="gold"/>
            </div>
          </>}

          {section === 'settings' && <>
            <PageHeading title="Paramètres" desc="Configuration du cabinet."/>
            <section className="panel">
              <h3>Informations du cabinet</h3>
              <p>Cabinet ORL — Dr M. SOUFIEN</p>
              <p>Devise utilisée : Dinar algérien (DA)</p>
              <p>Les prix des services sont saisis manuellement.</p>
            </section>
          </>}

          <footer>© {new Date().getFullYear()} CABINET ORL — Dr M. SOUFIEN • Espace médical confidentiel</footer>
        </div>
      </main>

      {showPatient && <Modal title="Nouveau patient" close={() => setShowPatient(false)}>
        <form onSubmit={savePatient} className="form-grid">
          <Field label="Nom" required><input required value={patientForm.last_name}
            onChange={e => setPatientForm({...patientForm, last_name:e.target.value})}/></Field>
          <Field label="Prénom" required><input required value={patientForm.first_name}
            onChange={e => setPatientForm({...patientForm, first_name:e.target.value})}/></Field>
          <Field label="Téléphone"><input value={patientForm.phone}
            onChange={e => setPatientForm({...patientForm, phone:e.target.value})}/></Field>
          <Field label="Date de naissance"><input type="date" value={patientForm.birth_date}
            onChange={e => setPatientForm({...patientForm, birth_date:e.target.value})}/></Field>
          <Field label="Sexe"><select value={patientForm.sex}
            onChange={e => setPatientForm({...patientForm, sex:e.target.value})}>
            <option value="">Non renseigné</option><option value="F">Féminin</option><option value="M">Masculin</option>
          </select></Field>
          <Field label="Adresse"><input value={patientForm.address}
            onChange={e => setPatientForm({...patientForm, address:e.target.value})}/></Field>
          <Field label="Notes administratives" wide><textarea value={patientForm.notes}
            onChange={e => setPatientForm({...patientForm, notes:e.target.value})}/></Field>
          <FormActions close={() => setShowPatient(false)} label="Enregistrer le patient"/>
        </form>
      </Modal>}

      {showAppointment && <Modal title="Nouveau rendez-vous" close={() => setShowAppointment(false)}>
        <form onSubmit={saveAppointment} className="form-grid">
          <Field label="Patient" wide required><select required value={appointmentForm.patient_id}
            onChange={e => setAppointmentForm({...appointmentForm, patient_id:e.target.value})}>
            <option value="">Sélectionner un patient</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>)}
          </select></Field>
          <Field label="Date" required><input type="date" required value={appointmentForm.appointment_date}
            onChange={e => setAppointmentForm({...appointmentForm, appointment_date:e.target.value})}/></Field>
          <Field label="Heure" required><input type="time" required value={appointmentForm.appointment_time}
            onChange={e => setAppointmentForm({...appointmentForm, appointment_time:e.target.value})}/></Field>
          <Field label="Motif" wide><input value={appointmentForm.reason}
            onChange={e => setAppointmentForm({...appointmentForm, reason:e.target.value})}/></Field>
          <FormActions close={() => setShowAppointment(false)} label="Enregistrer le rendez-vous"/>
        </form>
      </Modal>}

      {showConsultation && <Modal title="Nouvelle consultation" close={() => setShowConsultation(false)}>
        <form onSubmit={saveConsultation} className="form-grid">
          <Field label="Patient" wide required>
            <select required value={consultationForm.patient_id}
              onChange={e => setConsultationForm({...consultationForm, patient_id:e.target.value})}>
              <option value="">Sélectionner un patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>)}
            </select>
          </Field>

          <Field label="Service médical" wide required>
            <select required value={consultationForm.service_name}
              onChange={e => setConsultationForm({...consultationForm, service_name:e.target.value})}>
              {SERVICES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Prix en DA (saisie manuelle)">
            <input type="number" min="0" step="0.01" placeholder="Saisir le prix"
              value={consultationForm.fee_amount}
              onChange={e => setConsultationForm({...consultationForm, fee_amount:e.target.value})}/>
          </Field>

          <Field label="Motif" wide><textarea value={consultationForm.reason}
            onChange={e => setConsultationForm({...consultationForm, reason:e.target.value})}/></Field>
          <Field label="Antécédents / Histoire" wide><textarea value={consultationForm.history}
            onChange={e => setConsultationForm({...consultationForm, history:e.target.value})}/></Field>
          <Field label="Examen clinique" wide><textarea value={consultationForm.clinical_exam}
            onChange={e => setConsultationForm({...consultationForm, clinical_exam:e.target.value})}/></Field>
          <Field label="Examen ORL" wide><textarea value={consultationForm.orl_exam}
            onChange={e => setConsultationForm({...consultationForm, orl_exam:e.target.value})}/></Field>
          <Field label="Diagnostic" wide><textarea value={consultationForm.diagnosis}
            onChange={e => setConsultationForm({...consultationForm, diagnosis:e.target.value})}/></Field>
          <Field label="Traitement" wide><textarea value={consultationForm.treatment}
            onChange={e => setConsultationForm({...consultationForm, treatment:e.target.value})}/></Field>
          <Field label="Ordonnance" wide><textarea value={consultationForm.prescription}
            onChange={e => setConsultationForm({...consultationForm, prescription:e.target.value})}/></Field>
          <Field label="Suivi / Prochain contrôle" wide><textarea value={consultationForm.follow_up}
            onChange={e => setConsultationForm({...consultationForm, follow_up:e.target.value})}/></Field>

          <FormActions close={() => setShowConsultation(false)} label="Enregistrer la consultation"/>
        </form>
      </Modal>}

      {showPayment && <Modal title="Enregistrer un paiement" close={() => setShowPayment(false)}>
        <form onSubmit={savePayment} className="form-grid">
          <Field label="Patient" wide required>
            <select required value={paymentForm.patient_id}
              onChange={e => setPaymentForm({...paymentForm, patient_id:e.target.value, consultation_id:''})}>
              <option value="">Sélectionner un patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>)}
            </select>
          </Field>

          <Field label="Consultation liée" wide>
            <select value={paymentForm.consultation_id}
              onChange={e => setPaymentForm({...paymentForm, consultation_id:e.target.value})}>
              <option value="">Paiement non lié à une consultation</option>
              {consultations.filter(c => c.patient_id === paymentForm.patient_id)
                .map(c => <option key={c.id} value={c.id}>
                  {c.service_name || 'Consultation'} — {new Date(c.consultation_date).toLocaleDateString('fr-FR')}
                </option>)}
            </select>
          </Field>

          <Field label="Montant en DA" required>
            <input type="number" min="0.01" step="0.01" required placeholder="Saisir le montant"
              value={paymentForm.amount}
              onChange={e => setPaymentForm({...paymentForm, amount:e.target.value})}/>
          </Field>

          <Field label="Date du paiement" required>
            <input type="date" required value={paymentForm.payment_date}
              onChange={e => setPaymentForm({...paymentForm, payment_date:e.target.value})}/>
          </Field>

          <Field label="Mode de paiement">
            <select value={paymentForm.payment_method}
              onChange={e => setPaymentForm({...paymentForm, payment_method:e.target.value})}>
              <option>Espèces</option><option>Carte bancaire</option><option>Virement</option><option>Autre</option>
            </select>
          </Field>

          <Field label="Note" wide><textarea value={paymentForm.notes}
            onChange={e => setPaymentForm({...paymentForm, notes:e.target.value})}/></Field>

          <FormActions close={() => setShowPayment(false)} label="Enregistrer le paiement"/>
        </form>
      </Modal>}

      {selectedPatient && <Modal title="Dossier patient" close={() => setSelectedPatient(null)}>
        <div className="patient-detail">
          <div className="detail-avatar">{selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}</div>
          <h2>{selectedPatient.last_name} {selectedPatient.first_name}</h2>
          <p>{selectedPatient.phone || 'Téléphone non renseigné'}</p>
          <div className="detail-row"><span>Date de naissance</span><b>{selectedPatient.birth_date || '—'}</b></div>
          <div className="detail-row"><span>Adresse</span><b>{selectedPatient.address || '—'}</b></div>
        </div>
      </Modal>}
    </div>
  );
}

function Stat({icon: Icon, label, value, tone}) {
  return <div className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={20}/></div>
    <div><p>{label}</p><strong>{value}</strong></div>
  </div>;
}

function Quick({icon: Icon, label, onClick}) {
  return <button className="quick" onClick={onClick}>
    <span><Icon size={20}/></span><b>{label}</b><ArrowUpRight size={15}/>
  </button>;
}

function PageHeading({title, desc, action, onClick}) {
  return <div className="page-heading">
    <div><p className="eyebrow">GESTION DU CABINET</p><h1>{title}</h1><p className="muted">{desc}</p></div>
    {action && <button className="primary" onClick={onClick}><Plus size={17}/>{action}</button>}
  </div>;
}

function Field({label, children, wide, required}) {
  return <label className={wide ? 'field wide' : 'field'}>
    {label}{required && <em> *</em>}{children}
  </label>;
}

function FormActions({close, label}) {
  return <div className="form-actions">
    <button type="button" className="secondary" onClick={close}>Annuler</button>
    <button className="primary">{label}</button>
  </div>;
}

function Modal({title, close, children}) {
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}>
    <div className="modal">
      <div className="modal-head"><h2>{title}</h2>
        <button className="icon-btn" onClick={close}><X/></button>
      </div>
      {children}
    </div>
  </div>;
}

function PatientTable({patients, onSelect}) {
  return <div className="table-wrap"><table>
    <thead><tr><th>Patient</th><th>Téléphone</th><th>Date de naissance</th><th>Sexe</th><th></th></tr></thead>
    <tbody>
      {patients.map(p => <tr key={p.id} onClick={() => onSelect(p)}>
        <td><div className="person"><div className="person-avatar">{p.first_name?.[0]}{p.last_name?.[0]}</div><b>{p.last_name} {p.first_name}</b></div></td>
        <td>{p.phone || '—'}</td><td>{p.birth_date || '—'}</td>
        <td>{p.sex === 'F' ? 'Féminin' : p.sex === 'M' ? 'Masculin' : '—'}</td>
        <td><ArrowUpRight size={16}/></td>
      </tr>)}
      {!patients.length && <tr><td colSpan="5" className="empty">Aucun patient trouvé.</td></tr>}
    </tbody>
  </table></div>;
}

function AppointmentList({items, patients, detailed}) {
  return <div className="appointment-list">
    {items.map(a => {
      const p = a.patients || patients.find(x => x.id === a.patient_id) || {};
      return <div className="appointment-row" key={a.id}>
        <div className="time"><Clock size={15}/>{a.appointment_time || '—'}</div>
        <div className="appointment-person">
          <b>{p.last_name || 'Patient'} {p.first_name || ''}</b>
          <span>{a.reason || 'Consultation ORL'} {detailed && ` • ${a.appointment_date || ''}`}</span>
        </div>
        <span className={`status ${a.status || 'scheduled'}`}>
          {a.status === 'completed' ? 'Terminé' : a.status === 'cancelled' ? 'Annulé' : 'Confirmé'}
        </span>
      </div>;
    })}
    {!items.length && <div className="empty-block">Aucun rendez-vous enregistré.</div>}
  </div>;
}
