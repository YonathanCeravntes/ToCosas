import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, ErrorState, FormScroll, GroupLabel, Ico, IconName, Row, SegmentBar, Skeleton } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { DocKind, DocumentItem, DocumentsSummary, DocsConsent } from '../api/types';
import { documentsApi } from '../api/endpoints';
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
      <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
        {[currentYear, currentYear - 1].map((y) => {
          const on = y === year;
          return (
            <Pressable
              key={y}
              onPress={() => setYear(y)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? colors.primarySoft : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}
            >
              <Text style={{ color: on ? colors.primaryDark : colors.text, fontWeight: on ? '800' : '600' }}>{y}</Text>
            </Pressable>
          );
        })}
      </Row>

      {!consent.accepted ? <ConsentCard onDone={setConsent} /> : null}

      <YearCard summary={summary} />

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
              <Text style={{ color: on ? colors.textInverse : colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
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
          {exporting ? <ActivityIndicator color={colors.primary} /> : <Ico name="download-outline" color={colors.primaryDark} size={18} />}
          <Text style={{ color: colors.primaryDark, fontWeight: '800', fontSize: 15 }}>Descargar todo {year} (.zip)</Text>
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
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800' }}>{inv.count}</Text>
        <Text style={{ color: colors.textMuted, ...type.body }}>{inv.count === 1 ? 'factura' : 'facturas'} · {formatMoney(inv.total)}</Text>
      </Row>
      {inv.total > 0 ? (
        <SegmentBar
          parts={[
            { key: 'e', label: 'Tarjeta o transferencia', value: inv.electronicPaid, color: colors.primary },
            { key: 'c', label: 'Efectivo', value: inv.cash, color: colors.warning },
            { key: 'u', label: 'Sin dato o sin factura electrónica', value: inv.unknown, color: colors.textFaint },
          ]}
        />
      ) : null}
      <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm }}>
        {inv.deduction > 0 ? (
          <Text style={{ color: colors.text, ...type.small, lineHeight: 19 }}>
            <Text style={{ fontWeight: '800' }}>Deducción del 1%: {formatMoney(inv.deduction)}</Text> menos en tu base de renta. Solo cuentan las
            facturas electrónicas pagadas con tarjeta o transferencia: pide factura electrónica y paga con medio electrónico para sumar más.
          </Text>
        ) : (
          <Text style={{ color: colors.text, ...type.small, lineHeight: 19 }}>
            Cada factura electrónica pagada con tarjeta o transferencia te da una <Text style={{ fontWeight: '800' }}>deducción del 1%</Text> en la renta.
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
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
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
          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{title}</Text>
          <Text style={{ color: colors.textMuted, ...type.small }} numberOfLines={1}>{sub}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{doc.total != null ? formatMoney(doc.total) : '—'}</Text>
          {tag ? (
            <Text style={{ fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', color: tag.ok ? colors.primaryDark : colors.warningDeep, backgroundColor: tag.ok ? colors.primarySoft : colors.warningSoft }}>
              {tag.text}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingBottom: 12, paddingLeft: 42, gap: 6 }}>
          {doc.number ? <Text style={{ color: colors.textMuted, ...type.small }}>Factura {doc.number}{doc.tax ? ` · IVA ${formatMoney(doc.tax)}` : ''}</Text> : null}
          <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
            {doc.hasFile ? (
              <Pressable onPress={() => void download()} disabled={busy} accessibilityRole="button" style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 14 }}>
                {busy ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Ico name="download-outline" color={colors.textInverse} />}
                <Text style={{ color: colors.textInverse, fontWeight: '800' }}>Descargar</Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.textFaint, ...type.small, paddingVertical: 8 }}>De este documento guardamos los datos, no el archivo.</Text>
            )}
            <Pressable
              onPress={() => confirmRemove(title, 'Se borra de Millo para siempre, con su archivo.', async () => { await documentsApi.remove(doc.id); await onChanged(); })}
              accessibilityRole="button"
              style={{ paddingVertical: 8, paddingHorizontal: 8 }}
            >
              <Text style={{ color: colors.dangerDeep, fontWeight: '700' }}>Borrar</Text>
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
        <Ico name="shield-checkmark-outline" color={colors.primaryDark} size={20} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Millo va a guardar tus documentos</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4, lineHeight: 19 }}>
            Guardamos tus facturas, extractos y certificados cifrados para armar tus informes y el borrador de tu renta. Un servicio de
            inteligencia artificial los lee para sacar los datos; no guardamos tu cédula ni tus números de cuenta.
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
            <Ico name={health ? 'checkbox' : 'square-outline'} color={health ? colors.primary : colors.textMuted} size={20} />
            <Text style={{ color: colors.text, ...type.small, flex: 1 }}>Guardar también mis facturas de salud (dato sensible)</Text>
          </Pressable>
          <Row style={{ gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            <Pressable onPress={() => void accept()} disabled={busy} accessibilityRole="button" style={{ backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 18 }}>
              <Text style={{ color: colors.textInverse, fontWeight: '800' }}>{busy ? 'Guardando…' : 'Acepto'}</Text>
            </Pressable>
            <Pressable onPress={() => setMore(!more)} accessibilityRole="button" style={{ paddingVertical: 9, paddingHorizontal: 6 }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{more ? 'Ver menos' : 'Ver detalles'}</Text>
            </Pressable>
            <Pressable onPress={() => setLater(true)} accessibilityRole="button" style={{ paddingVertical: 9, paddingHorizontal: 6 }}>
              <Text style={{ color: colors.textMuted }}>Ahora no</Text>
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
        <Text style={{ color: colors.primary, fontWeight: '700', ...type.small }}>Privacidad de mis documentos</Text>
      </Pressable>
      {open ? (
        <Card style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}>
          <Text style={{ color: colors.textMuted, ...type.small, lineHeight: 19 }}>
            Autorizaste guardar tus documentos{consent.acceptedAt ? ` el ${shortDate(consent.acceptedAt)}` : ''}.
            {consent.health ? ' Incluye facturas de salud.' : ' Las facturas de salud no se guardan.'}
          </Text>
          <Row style={{ gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            <Pressable onPress={() => void documentsApi.grant(!consent.health).then(onChanged)} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '700', ...type.small }}>{consent.health ? 'No guardar las de salud' : 'Guardar también las de salud'}</Text>
            </Pressable>
            <Pressable onPress={() => void documentsApi.revoke(false).then(onChanged)} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '700', ...type.small }}>Dejar de guardar</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmRemove('todos mis documentos', 'Se borran todos, con sus archivos, y Millo deja de guardarlos.', () => documentsApi.revoke(true).then(onChanged))}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.dangerDeep, fontWeight: '700', ...type.small }}>Borrar todo</Text>
            </Pressable>
          </Row>
        </Card>
      ) : null}
    </View>
  );
}

function EmptyTab({ tab, consented }: { tab: Tab; consented: boolean }) {
  const what = tab === 'facturas' ? 'facturas' : tab === 'extractos' ? 'extractos' : 'certificados';
  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textFaint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>Aún no tienes {what} aquí</Text>
      <Text style={{ color: colors.textMuted, ...type.small, marginTop: 2, lineHeight: 19 }}>
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
