import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, ErrorState, FormScroll, GroupLabel, Ico, IconName, Row, SegmentBar, Skeleton } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { DocKind, DocumentIntake, DocumentItem, DocumentsSummary, DocsConsent } from '../api/types';
import { documentsApi, transactionsApi } from '../api/endpoints';
import { confirmRemove } from '../utils/confirm';

/**
 * FIN-054 · Mis documentos, opción 1 del Fundador (2026-09-30): "Tu año para la renta".
 *  - Arriba: facturas del año, barra pagado con tarjeta/transferencia vs efectivo y la
 *    deducción del 1% dicha con honestidad (resta de la base, no es plata ahorrada).
 *  - Pestañas Facturas / Extractos / Certificados; lista por mes; descargar o borrar.
 *  - Descargar todo el año (.zip con los archivos y un resumen.csv).
 *  - Nada se guarda sin el permiso específico (Ley 1581); salud aparte (dato sensible).
 * Esta pantalla no calcula: el resumen y la deducción vienen del backend.
 */
type Tab = 'facturas' | 'extractos' | 'certificados';

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const PAY: Record<string, string> = { tarjeta: 'Tarjeta', transferencia: 'Transferencia', efectivo: 'Efectivo', desconocido: 'Medio de pago sin dato' };
const CERT: Record<string, string> = {
  ingresos_retenciones: 'Ingresos y retenciones',
  bancario: 'Certificado bancario',
  intereses_vivienda: 'Intereses de vivienda',
  medicina_prepagada: 'Medicina prepagada',
  aportes_voluntarios: 'Aportes voluntarios',
  otro: 'Certificado',
};
const KIND_LABEL: Record<DocKind, string> = {
  factura: 'Factura electrónica',
  comprobante: 'Comprobante',
  extracto_tarjeta: 'Extracto de tarjeta',
  extracto_credito: 'Extracto de crédito',
  extracto_cuenta: 'Extracto de cuenta',
  certificado: 'Certificado',
};

export function DocumentsScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tab, setTab] = useState<Tab>('facturas');
  const [consent, setConsent] = useState<DocsConsent | null>(null);
  const [summary, setSummary] = useState<DocumentsSummary | null>(null);
  const [items, setItems] = useState<DocumentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [c, s, l] = await Promise.all([documentsApi.consent(), documentsApi.summary(year), documentsApi.list(year, tab)]);
      setConsent(c);
      setSummary(s);
      setItems(l);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [year, tab]);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const groups = useMemo(() => groupByMonth(items ?? []), [items]);

  const downloadAll = async () => {
    setExporting(true);
    try {
      const { url } = await documentsApi.exportLink(year);
      await Linking.openURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (error && !summary) return <FormScroll><ErrorState message={error} onRetry={() => void load()} /></FormScroll>;
  if (!summary || !consent) return <FormScroll><Skeleton hero lines={3} /><Skeleton lines={4} /></FormScroll>;

  return (
    <FormScroll onRefresh={load}>
      {/* Año */}
      {/* FIN-060: control segmentado para el año. */}
      <Row style={{ alignSelf: 'flex-start', gap: 3, padding: 3, borderRadius: 10, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md }}>
        {[currentYear, currentYear - 1].map((y) => {
          const on = y === year;
          return (
            <Pressable
              key={y}
              onPress={() => setYear(y)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ minWidth: 72, paddingHorizontal: 14, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent' }}
            >
              <Text style={{ color: on ? colors.text : colors.textMuted, ...type.small, fontWeight: '600' }}>{y}</Text>
            </Pressable>
          );
        })}
      </Row>

      {!consent.accepted ? <ConsentCard onDone={setConsent} /> : null}

      <YearCard summary={summary} />

      {/* FIN-056 (boceto 6): subir una foto o PDF desde la app, sin pasar por Telegram. */}
      {consent.accepted ? <UploadCard onSaved={load} /> : null}

      {/* Pestañas */}
      <Row style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        {([
          ['facturas', `Facturas ${summary.counts.facturas}`],
          ['extractos', `Extractos ${summary.counts.extractos}`],
          ['certificados', `Certificados ${summary.counts.certificados}`],
        ] as Array<[Tab, string]>).map(([k, label]) => {
          const on = k === tab;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}
            >
              <Text style={{ color: on ? colors.textInverse : colors.text, ...type.small, fontWeight: on ? '600' : '500' }}>{label}</Text>
            </Pressable>
          );
        })}
      </Row>

      {items === null ? (
        <View style={{ padding: spacing.lg, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <EmptyTab tab={tab} consented={consent.accepted} />
      ) : (
        groups.map((g) => (
          <View key={g.key}>
            <GroupLabel title={`${g.label} · ${g.items.length} ${tabNoun(tab, g.items.length)}`} />
            <Card style={{ paddingVertical: 0 }}>
              {g.items.map((d, i) => (
                <DocRow key={d.id} doc={d} first={i === 0} onChanged={load} />
              ))}
            </Card>
          </View>
        ))
      )}

      {summary.counts.facturas + summary.counts.extractos + summary.counts.certificados > 0 ? (
        <Pressable
          onPress={() => void downloadAll()}
          disabled={exporting}
          accessibilityRole="button"
          style={{ height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md }}
        >
          {exporting ? <ActivityIndicator color={colors.primary} /> : <Ico name="download-outline" color={colors.primary} size={18} />}
          <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>Descargar todo {year} (.zip)</Text>
        </Pressable>
      ) : null}
      {!summary.filesEnabled && summary.counts.facturas + summary.counts.extractos + summary.counts.certificados > 0 ? (
        <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xs }}>
          Por ahora guardamos los datos de cada documento; el .zip trae el resumen en una hoja de cálculo.
        </Text>
      ) : null}

      {consent.accepted ? <PrivacyFooter consent={consent} onChanged={(c) => { setConsent(c); void load(); }} /> : null}
    </FormScroll>
  );
}

/** Tarjeta del año (opción 1): cuántas facturas, cómo se pagaron y la deducción del 1%. */
function YearCard({ summary }: { summary: DocumentsSummary }) {
  const inv = summary.invoices;
  return (
    <Card>
      <Text style={{ color: colors.textMuted, ...type.small }}>Tus facturas de {summary.year}</Text>
      <Row style={{ alignItems: 'baseline', gap: 8, marginTop: 2, marginBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -0.8 }}>{inv.count}</Text>
        <Text style={{ color: colors.textMuted, ...type.body }}>{inv.count === 1 ? 'factura' : 'facturas'} · {formatMoney(inv.total)}</Text>
      </Row>
      {inv.total > 0 ? (
        <SegmentBar
          parts={[
            { key: 'e', label: 'Tarjeta o transferencia', value: inv.electronicPaid, color: colors.primary },
            { key: 'c', label: 'Efectivo', value: inv.cash, color: colors.warningDeep },
            { key: 'u', label: 'Sin dato o sin factura electrónica', value: inv.unknown, color: colors.textFaint },
          ]}
        />
      ) : null}
      <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm }}>
        {inv.deduction > 0 ? (
          <Text style={{ color: colors.text, ...type.small, lineHeight: 19 }}>
            <Text style={{ fontWeight: '600' }}>Deducción del 1%: {formatMoney(inv.deduction)}</Text> menos en tu base de renta. Solo cuentan las
            facturas electrónicas pagadas con tarjeta o transferencia: pide factura electrónica y paga con medio electrónico para sumar más.
          </Text>
        ) : (
          <Text style={{ color: colors.text, ...type.small, lineHeight: 19 }}>
            Cada factura electrónica pagada con tarjeta o transferencia te da una <Text style={{ fontWeight: '600' }}>deducción del 1%</Text> en la renta.
            Mándale a Millo tus facturas por Telegram y aquí vas viendo cuánto llevas.
          </Text>
        )}
      </View>
    </Card>
  );
}

function DocRow({ doc, first, onChanged }: { doc: DocumentItem; first: boolean; onChanged: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const invoice = doc.kind === 'factura' || doc.kind === 'comprobante';
  const cert = doc.kind === 'certificado';
  const counts = doc.electronic && (doc.paymentMethod === 'tarjeta' || doc.paymentMethod === 'transferencia');
  const style = cert
    ? { icon: 'ribbon-outline' as IconName, fg: colors.warningDeep, bg: colors.warningSoft }
    : invoice
      ? counts
        ? { icon: 'receipt-outline' as IconName, fg: colors.primaryDark, bg: colors.primarySoft }
        : { icon: 'receipt-outline' as IconName, fg: colors.warningDeep, bg: colors.warningSoft }
      : { icon: 'document-text-outline' as IconName, fg: colors.info, bg: colors.infoSoft };
  const title = doc.issuer ?? KIND_LABEL[doc.kind];
  const sub = cert
    ? `${CERT[doc.certificateType ?? 'otro'] ?? 'Certificado'}${doc.docDate ? ` · ${shortDate(doc.docDate)}` : ''}`
    : invoice
      ? `${doc.docDate ? shortDate(doc.docDate) : 'Sin fecha'} · ${PAY[doc.paymentMethod]}${doc.isHealth ? ' · salud' : ''}`
      : `${KIND_LABEL[doc.kind]}${doc.docDate ? ` · corte ${shortDate(doc.docDate)}` : ''}`;
  const tag = invoice
    ? counts
      ? { text: 'Cuenta para tu renta', ok: true }
      : !doc.electronic
        ? { text: 'Sin factura electrónica', ok: false }
        : doc.paymentMethod === 'efectivo'
          ? { text: 'Efectivo: no cuenta', ok: false }
          : { text: 'Revisa el medio de pago', ok: false }
    : cert
      ? { text: 'Para tu renta', ok: true }
      : doc.debtId
        ? { text: 'Deuda actualizada', ok: true }
        : null;

  const download = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { url } = await documentsApi.download(doc.id);
      await Linking.openURL(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${sub}${doc.total != null ? `, ${formatMoney(doc.total)}` : ''}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11 }}
      >
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Ico name={style.icon} color={style.fg} size={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }} numberOfLines={1}>{title}</Text>
          <Text style={{ color: colors.textFaint, ...type.small }} numberOfLines={1}>{sub}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{doc.total != null ? formatMoney(doc.total) : '—'}</Text>
          {tag ? (
            <Text style={{ fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', color: tag.ok ? colors.primaryDark : colors.warningDeep, backgroundColor: tag.ok ? colors.primarySoft : colors.warningSoft }}>
              {tag.text}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingBottom: 12, paddingLeft: 42, gap: 6 }}>
          {doc.number ? <Text style={{ color: colors.textFaint, ...type.small }}>Factura {doc.number}{doc.tax ? ` · IVA ${formatMoney(doc.tax)}` : ''}</Text> : null}
          <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
            {doc.hasFile ? (
              <Pressable onPress={() => void download()} disabled={busy} accessibilityRole="button" style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 14 }}>
                {busy ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Ico name="download-outline" color={colors.textInverse} />}
                <Text style={{ color: colors.textInverse, ...type.small, fontWeight: '600' }}>Descargar</Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.textFaint, ...type.small, paddingVertical: 8 }}>De este documento guardamos los datos, no el archivo.</Text>
            )}
            <Pressable
              onPress={() => confirmRemove(title, 'Se borra de Millo para siempre, con su archivo.', async () => { await documentsApi.remove(doc.id); await onChanged(); })}
              accessibilityRole="button"
              style={{ paddingVertical: 8, paddingHorizontal: 8 }}
            >
              <Text style={{ color: colors.danger, ...type.small, fontWeight: '600' }}>Borrar</Text>
            </Pressable>
          </Row>
          {err ? <Text style={{ color: colors.danger, ...type.small }}>{err}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Ley 1581: autorización previa, expresa e informada antes de guardar. Salud aparte. */
function ConsentCard({ onDone }: { onDone: (c: DocsConsent) => void }) {
  const [health, setHealth] = useState(false);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [later, setLater] = useState(false);
  if (later) return null;
  const accept = async () => {
    setBusy(true);
    try {
      onDone(await documentsApi.grant(health));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ borderColor: colors.primaryLight }}>
      <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
        <Ico name="shield-checkmark-outline" color={colors.primary} size={20} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, ...type.bodyLg, fontWeight: '600' }}>Millo va a guardar tus documentos</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4, lineHeight: 19 }}>
            Guardamos tus facturas, extractos y certificados cifrados para armar tus informes y el borrador de tu renta. La inteligencia
            artificial de Millo (Google Gemini, EE. UU.) los lee para sacar los datos; no guardamos tu cédula ni tus números de cuenta.
          </Text>
          {more ? (
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: 6, lineHeight: 19 }}>
              Se almacenan en servidores de Estados Unidos (país con protección adecuada según la SIC). Los conservamos 5 años o hasta que los
              borres. Puedes descargarlos o borrarlos cuando quieras aquí mismo, y quitar el permiso cuando quieras. Las facturas de salud
              (farmacia, EPS, medicina prepagada) son datos sensibles: no estás obligado a autorizarlas.
            </Text>
          ) : null}
          <Pressable
            onPress={() => setHealth(!health)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: health }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, minHeight: 36 }}
          >
            <Ico name={health ? 'checkbox' : 'square-outline'} color={health ? colors.primary : colors.textFaint} size={20} />
            <Text style={{ color: colors.text, ...type.small, flex: 1 }}>Guardar también mis facturas de salud (dato sensible)</Text>
          </Pressable>
          <Row style={{ gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            <Pressable onPress={() => void accept()} disabled={busy} accessibilityRole="button" style={{ backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 18 }}>
              <Text style={{ color: colors.textInverse, ...type.body, fontWeight: '600' }}>{busy ? 'Guardando…' : 'Acepto'}</Text>
            </Pressable>
            <Pressable onPress={() => setMore(!more)} accessibilityRole="button" style={{ paddingVertical: 9, paddingHorizontal: 6 }}>
              <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>{more ? 'Ver menos' : 'Ver detalles'}</Text>
            </Pressable>
            <Pressable onPress={() => setLater(true)} accessibilityRole="button" style={{ paddingVertical: 9, paddingHorizontal: 6 }}>
              <Text style={{ color: colors.textFaint, ...type.body }}>Ahora no</Text>
            </Pressable>
          </Row>
        </View>
      </Row>
    </Card>
  );
}

function PrivacyFooter({ consent, onChanged }: { consent: DocsConsent; onChanged: (c: DocsConsent) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button">
        <Text style={{ color: colors.primary, fontWeight: '600', ...type.small }}>Privacidad de mis documentos</Text>
      </Pressable>
      {open ? (
        <Card style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}>
          <Text style={{ color: colors.textMuted, ...type.small, lineHeight: 19 }}>
            Autorizaste guardar tus documentos{consent.acceptedAt ? ` el ${shortDate(consent.acceptedAt)}` : ''}.
            {consent.health ? ' Incluye facturas de salud.' : ' Las facturas de salud no se guardan.'}
          </Text>
          <Row style={{ gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            <Pressable onPress={() => void documentsApi.grant(!consent.health).then(onChanged)} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '600', ...type.small }}>{consent.health ? 'No guardar las de salud' : 'Guardar también las de salud'}</Text>
            </Pressable>
            <Pressable onPress={() => void documentsApi.revoke(false).then(onChanged)} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '600', ...type.small }}>Dejar de guardar</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmRemove('todos mis documentos', 'Se borran todos, con sus archivos, y Millo deja de guardarlos.', () => documentsApi.revoke(true).then(onChanged))}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.danger, fontWeight: '600', ...type.small }}>Borrar todo</Text>
            </Pressable>
          </Row>
        </Card>
      ) : null}
    </View>
  );
}

/**
 * FIN-056 (boceto 6) · Subir desde la app. En la web se usa el selector de archivos del
 * navegador (en el celular abre la cámara o la galería). En la app instalada hace falta
 * un módulo nativo que no viaja por OTA: hasta la próxima versión, se indica Telegram.
 */
function UploadCard({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DocumentIntake | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const cameraRef = React.useRef<HTMLInputElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const send = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setRegistered(false);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await documentsApi.upload(form);
      setResult(r);
      if (r.status === 'guardado') await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onPick = (ev: { target: { files?: FileList | null; value?: string } }) => {
    const f = ev.target.files?.[0];
    if (f) void send(f);
    if (ev.target) ev.target.value = '';
  };

  const registerProposal = async () => {
    if (!result || result.status !== 'guardado' || !result.proposal) return;
    setRegistering(true);
    setError(null);
    try {
      const p = result.proposal;
      const tx = await transactionsApi.create({
        kind: 'gasto',
        amount: p.amount,
        occurredAt: `${p.occurredAt}T12:00:00.000Z`,
        note: p.merchant ?? undefined,
        paymentMethod: p.paymentMethod === 'desconocido' ? undefined : p.paymentMethod,
      });
      await documentsApi.link(result.document.id, tx.id).catch(() => undefined);
      setRegistered(true);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegistering(false);
    }
  };

  const statusText = (r: DocumentIntake): string => {
    switch (r.status) {
      case 'guardado': return r.summary;
      case 'no_reconocido': return `No reconocí una factura, extracto ni certificado con datos suficientes${r.notes ? ` (${r.notes})` : ''}. Prueba con una foto más nítida.`;
      case 'ia_no_disponible': return 'La lectura con IA no está disponible en este momento. Inténtalo en unos minutos.';
      case 'formato_no_soportado': return 'Solo puedo leer fotos (JPG, PNG) o PDF.';
      case 'salud_sin_permiso': return 'Es una factura de salud y no autorizaste guardarlas. Puedes activarlo abajo, en Privacidad de mis documentos.';
      default: return 'Primero acepta que Millo guarde tus documentos.';
    }
  };

  const isWeb = Platform.OS === 'web';
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2, borderStyle: 'dashed' }}>
      <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ico name="cloud-upload-outline" color={colors.primary} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Subir una factura, extracto o certificado</Text>
          <Text style={{ color: colors.textFaint, ...type.small }}>Millo lo lee, lo guarda y te propone el gasto: tú confirmas.</Text>
        </View>
      </Row>
      {isWeb ? (
        <>
          {React.createElement('input', { ref: cameraRef, type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, onChange: onPick })}
          {React.createElement('input', { ref: fileRef, type: 'file', accept: 'image/*,application/pdf', style: { display: 'none' }, onChange: onPick })}
          <Row style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Tomar foto" icon="camera-outline" onPress={() => cameraRef.current?.click()} loading={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Elegir archivo" icon="document-outline" variant="secondary" onPress={() => fileRef.current?.click()} disabled={busy} />
            </View>
          </Row>
        </>
      ) : (
        <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.sm, lineHeight: 18 }}>
          En la app instalada, por ahora, mándasela a Millo por Telegram: la reconoce y la guarda aquí. Tomar la foto desde esta pantalla llega en la próxima versión de la app.
        </Text>
      )}
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>También puedes mandarlo por Telegram, como hasta ahora.</Text>

      {error ? <Text style={{ color: colors.danger, ...type.small, marginTop: spacing.sm }}>{error}</Text> : null}
      {result ? (
        <View style={{ marginTop: spacing.sm, backgroundColor: result.status === 'guardado' ? colors.successSoft : colors.warningSoft, borderRadius: radius.sm, padding: spacing.sm }}>
          <Text style={{ color: colors.text, ...type.small, lineHeight: 18 }}>{statusText(result)}</Text>
          {result.status === 'guardado' && result.proposal && !result.proposal.alreadyRegistered ? (
            registered ? (
              <Row style={{ gap: 6, marginTop: 6 }}>
                <Ico name="checkmark-circle" color={colors.primary} size={15} />
                <Text style={{ color: colors.primaryDark, ...type.small, fontWeight: '600', flex: 1 }}>Gasto registrado y enlazado a la factura.</Text>
              </Row>
            ) : (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={{ color: colors.text, ...type.small, fontWeight: '600' }}>
                  ¿Registro el gasto de {formatMoney(result.proposal.amount)}{result.proposal.merchant ? ` en ${result.proposal.merchant}` : ''} ({result.proposal.occurredAt})?
                </Text>
                <Row style={{ gap: spacing.sm, marginTop: 6 }}>
                  <Pressable onPress={() => void registerProposal()} disabled={registering} accessibilityRole="button" style={{ backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 14 }}>
                    <Text style={{ color: colors.textInverse, fontWeight: '600', ...type.small }}>{registering ? 'Registrando…' : 'Sí, registrarlo'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setResult({ ...result, proposal: null })} accessibilityRole="button" style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
                    <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600' }}>No, solo guardarla</Text>
                  </Pressable>
                </Row>
              </View>
            )
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function EmptyTab({ tab, consented }: { tab: Tab; consented: boolean }) {
  const what = tab === 'facturas' ? 'facturas' : tab === 'extractos' ? 'extractos' : 'certificados';
  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textFaint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md }}>
      <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Aún no tienes {what} aquí</Text>
      <Text style={{ color: colors.textFaint, ...type.small, marginTop: 2, lineHeight: 19 }}>
        {consented
          ? `Mándale a Millo por Telegram la foto o el PDF ${tab === 'certificados' ? 'de tu certificado de ingresos y retenciones o de tus certificados bancarios' : tab === 'extractos' ? 'de tus extractos' : 'de tus facturas'}: los reconoce y los guarda aquí.`
          : 'Acepta arriba que Millo guarde tus documentos y mándaselos por Telegram.'}
      </Text>
    </View>
  );
}

function groupByMonth(items: DocumentItem[]) {
  const map = new Map<string, { key: string; label: string; items: DocumentItem[] }>();
  for (const d of items) {
    const key = d.docDate ? d.docDate.slice(0, 7) : 'sin-fecha';
    const label = d.docDate ? MONTHS[Number(d.docDate.slice(5, 7)) - 1] : 'SIN FECHA';
    const g = map.get(key) ?? { key, label, items: [] };
    g.items.push(d);
    map.set(key, g);
  }
  return [...map.values()];
}

function tabNoun(tab: Tab, n: number) {
  const one = tab === 'facturas' ? 'factura' : tab === 'extractos' ? 'extracto' : 'certificado';
  return n === 1 ? one : `${one}s`;
}

function shortDate(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
}
