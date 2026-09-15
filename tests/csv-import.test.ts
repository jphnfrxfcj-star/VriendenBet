import { describe, expect, it } from 'vitest'
import { csvImportSchema, matchParticipant, parseParticipantCsv, parseScore, readCsv } from '../lib/csv-import'

describe('CSV importeren', () => {
  it('leest Google Forms met BOM, CRLF, quotes, decimalen en vrije tekst', () => {
    const result = parseParticipantCsv('\uFEFF"Naam en Voornaam","Maat trui","Kracht  ","Testoteron","Bereheidheid om te neuken","Eventuele opmerkingen"\r\n"Voorbeeld Jan ","L","2.5","7","0,5","Regel 1\nHij zegt ""hoi"""\r\n')
    expect(result.parameters).toEqual(['kracht', 'testosteron', 'bereidheid om te neuken'])
    expect(result.rows).toEqual([{ name: 'Voorbeeld Jan', shirtSize: 'L', scores: { kracht: '2.5', testosteron: '7', 'bereidheid om te neuken': '0,5' } }])
  })
  it('ondersteunt puntkomma, lege scores en gedeeltelijke parameterlijsten', () => {
    expect(parseParticipantCsv('Naam;IQ;Lucky factor\nTest;7,5;\n').rows[0].scores).toEqual({ IQ: '7,5', 'Lucky factor': '' })
  })
  it('bewaart onduidelijke waarden zodat de beheerder ze kan corrigeren', () => {
    const { rows } = parseParticipantCsv('Naam,Kracht,Alcoholbestendigheid\nTest,-5,1 meer dan lievens')
    expect(rows[0].scores).toEqual({ kracht: '-5', alcoholbestendigheid: '1 meer dan lievens' })
    for (const raw of ['5?', '-5', '11', 'Infinity', '1 meer dan lievens', '5abc']) expect(parseScore(raw)).toBeNaN()
    expect(parseScore('0')).toBe(0)
    expect(parseScore('0,5')).toBe(0.5)
    expect(parseScore('7.5')).toBe(7.5)
    expect(parseScore(' ')).toBeNull()
  })
  it('weigert beschadigde, dubbele en te grote bestanden', () => {
    expect(() => readCsv('Naam,Kracht\n"Test,5')).toThrow()
    expect(() => parseParticipantCsv('Naam,Kracht\nTest,5,6')).toThrow()
    expect(() => parseParticipantCsv('Naam,Kracht\nTest,5\n test ,6')).toThrow(/dubbel/)
    expect(() => parseParticipantCsv('Naam,geluk,Lucky factor\nTest,5,6')).toThrow(/meerdere/)
    expect(() => readCsv('x'.repeat(200_001))).toThrow(/200 kB/)
    expect(() => parseParticipantCsv('Naam,Kracht\n' + Array.from({ length: 201 }, (_, i) => `Test ${i},5`).join('\n'))).toThrow(/200 deelnemers/)
  })
  it('koppelt alleen unieke volledige namen of bijnamen, ongeacht naamvolgorde', () => {
    const participants = [{ id: '1', name: 'Jan Voorbeeld', nickname: 'Jakkeball' }, { id: '2', name: 'Jan Andere', nickname: null }]
    expect(matchParticipant(' Voorbeeld Jan ', participants)).toBe('1')
    expect(matchParticipant('Jakkeball', participants)).toBe('1')
    expect(matchParticipant('Jan', participants)).toBe('')
    expect(matchParticipant('Jan Voorbeeld', [...participants, { ...participants[0], id: '3' }])).toBe('')
  })
  it('valideert ook de payload op de server: geen onbekende parameters of ongeldige scores', () => {
    const base = { overwrite: false, rows: [{ name: 'Test', participantId: null, shirtSize: 'M', scores: { kracht: 0.5 } }] }
    expect(csvImportSchema.safeParse(base).success).toBe(true)
    for (const scores of [{ kracht: -5 }, { kracht: NaN }, { kracht: 11 }, { onbekend: 5 }]) {
      expect(csvImportSchema.safeParse({ ...base, rows: [{ ...base.rows[0], scores }] }).success).toBe(false)
    }
  })
})
