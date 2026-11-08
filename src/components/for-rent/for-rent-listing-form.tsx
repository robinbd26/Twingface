'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { Field, FormAlert } from '@/components/ui/form-field';
import { ALL_DISTRICTS, DISTRICTS_BY_DIVISION, DIVISIONS } from '@/lib/constants';
import { AVAILABILITY_LABELS, PRICE_UNIT_LABELS, nodeName, text } from '@/lib/mediaworld/labels';
import { NETWORK_ERROR, INPUT_CLASS, readError, readFieldErrors, sendForm, type FieldErrors } from '@/lib/client/forms';
import { MAX_RENTAL_PHOTOS, RENTAL_AVAILABILITY_VALUES, RENTAL_PRICE_UNITS, type RentalAvailabilityValue, type RentalPriceUnit } from '@/lib/mediaworld/rental';
import { rentalFieldGroup, type RentalFormValues } from '@/lib/mediaworld/rental-form';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import ForRentPhotoPicker from './for-rent-photo-picker';

type Props = {
  mode: 'create' | 'edit';
  listingId?: string;
  rentalCategories: TaxonomySnapshot['rentalCategories'];
  initial: RentalFormValues;
  existingPhotos: { id: string; url: string }[];
};

export default function ForRentListingForm({ mode, listingId, rentalCategories, initial, existingPhotos }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [retainedIds, setRetainedIds] = useState<string[]>(existingPhotos.map((photo) => photo.id));
  const [saving, setSaving] = useState(false);

  const category = rentalCategories.find((item) => item.id === values.categoryId);
  const group = category ? rentalFieldGroup(category.code) : null;
  const districts: readonly string[] = values.division
    ? (DISTRICTS_BY_DIVISION as Record<string, readonly string[]>)[values.division] ?? ALL_DISTRICTS
    : ALL_DISTRICTS;

  function set<K extends keyof RentalFormValues>(key: K, value: RentalFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function buildBody(): FormData {
    const body = new FormData();
    const put = (key: keyof RentalFormValues, value = values[key]) => {
      if (typeof value === 'boolean') body.set(key, String(value));
      else if (typeof value === 'string' && value.trim() !== '') body.set(key, value.trim());
    };

    put('title');
    put('description');
    put('categoryId');
    put('subcategoryId');
    put('priceUnit');
    if (values.priceTaka.trim() !== '') body.set('pricePaisa', String(Math.round(Number(values.priceTaka) * 100)));
    if (values.priceUnit === 'CUSTOM') put('priceCustom');
    put('location');
    put('division');
    put('district');
    put('availability');
    put('contactPhone');
    put('contactEmail');
    put('terms');

    if (group === 'vehicle') {
      put('vehicleType');
      put('seatingCapacity');
      put('driverIncluded');
    } else if (group === 'location') {
      put('roomCount');
      put('facilities');
      put('parkingAvailable');
      put('availableHours');
    } else if (group === 'equipment') {
      put('brandModel');
      put('quantity');
      put('condition');
      put('accessories');
    }

    files.forEach((file) => body.append('photos', file));
    if (mode === 'edit') retainedIds.forEach((id) => body.append('retainedPhotoIds', id));
    return body;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setBanner(null);
    setErrors({});
    const result =
      mode === 'edit' && listingId
        ? await sendForm(`/api/for-rent/${listingId}`, 'PATCH', buildBody())
        : await sendForm('/api/for-rent', 'POST', buildBody());
    setSaving(false);

    if (result.ok) {
      setFiles([]);
      if (mode === 'create') {
        const created = (result.json as { listing?: { id?: string } } | null)?.listing?.id;
        if (created) {
          router.push(`/for-rent/${created}`);
          return;
        }
      }
      setBanner({ tone: 'ok', text: bn ? 'তালিকা সংরক্ষিত হয়েছে।' : 'Listing saved.' });
      return;
    }

    setErrors(readFieldErrors(result.json));
    setBanner({
      tone: 'error',
      text: result.status === 0
        ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
        : readError(result.json, { bn: 'তালিকা সংরক্ষণ করা যায়নি।', en: 'Unable to save the listing.' }, bn),
    });
  }

  return (
    <form className='mw-rent-form' onSubmit={submit}>
      <div className='mw-rent-detail-bar'>
        <h1>{mode === 'edit' ? (bn ? 'তালিকা সম্পাদনা' : 'Edit listing') : bn ? 'নতুন ভাড়ার তালিকা' : 'New rental listing'}</h1>
        <div className='mw-rent-links'>
          <Link href='/for-rent'>{bn ? '← ভাড়া বাজার' : '← Browse For Rent'}</Link>
          <Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>{bn ? '← মিডিয়া ওয়ার্ল্ড' : '← Media World'}</Link>
          <MediaWorldLanguageToggle />
        </div>
      </div>
      {banner ? <FormAlert message={banner.text} tone={banner.tone} /> : null}

      <h2>{bn ? 'মূল তথ্য' : 'Basics'}</h2>
      <Field id='title' label={bn ? 'তালিকার শিরোনাম' : 'Listing title'} errors={errors}>
        <input id='title' className={INPUT_CLASS} value={values.title} onChange={(event) => set('title', event.target.value)} maxLength={160} required />
      </Field>
      <Field
        id='description'
        label={bn ? 'বিবরণ' : 'Description'}
        errors={errors}
        hint={bn ? 'কমপক্ষে ১০ অক্ষর — কী অন্তর্ভুক্ত, কোন অবস্থায়, কীভাবে ব্যবহার হয়।' : 'At least 10 characters — what is included, condition, how it is used.'}
      >
        <textarea id='description' className={`${INPUT_CLASS} mw-rent-textarea`} value={values.description} onChange={(event) => set('description', event.target.value)} maxLength={3000} rows={5} required />
      </Field>

      <div className='mw-rent-two-col'>
        <Field id='categoryId' label={bn ? 'ক্যাটাগরি' : 'Category'} errors={errors}>
          <select id='categoryId' className={INPUT_CLASS} value={values.categoryId} onChange={(event) => { set('categoryId', event.target.value); set('subcategoryId', ''); }} required>
            <option value=''>{bn ? 'বেছে নিন' : 'Choose a category'}</option>
            {rentalCategories.map((item) => <option key={item.id} value={item.id}>{nodeName(item, bn)}</option>)}
          </select>
        </Field>
        <Field id='subcategoryId' label={bn ? 'সাব-ক্যাটাগরি' : 'Subcategory'} errors={errors}>
          <select id='subcategoryId' className={INPUT_CLASS} value={values.subcategoryId} onChange={(event) => set('subcategoryId', event.target.value)} disabled={!category}>
            <option value=''>{category ? (bn ? 'নাই (ঐচ্ছিক)' : 'None (optional)') : bn ? 'আগে ক্যাটাগরি বেছে নিন' : 'Choose a category first'}</option>
            {(category?.subcategories ?? []).map((item) => <option key={item.id} value={item.id}>{nodeName(item, bn)}</option>)}
          </select>
        </Field>
      </div>

      <h2>{bn ? 'দাম' : 'Price'}</h2>
      <div className='mw-rent-two-col'>
        <Field id='pricePaisa' label={bn ? 'দাম (৳)' : 'Price (৳)'} errors={errors} hint={bn ? 'কাস্টম রেট চাইলে দাম ০ রেখে নিচের ঘরে লিখুন।' : 'Leave empty and use the custom rate field instead.'}>
          <input id='pricePaisa' type='number' min={0} step={1} className={INPUT_CLASS} value={values.priceTaka} onChange={(event) => set('priceTaka', event.target.value)} />
        </Field>
        <Field id='priceUnit' label={bn ? 'দামের একক' : 'Price unit'} errors={errors}>
          <select id='priceUnit' className={INPUT_CLASS} value={values.priceUnit} onChange={(event) => set('priceUnit', event.target.value)}>
            {RENTAL_PRICE_UNITS.map((unit) => <option key={unit} value={unit}>{text(PRICE_UNIT_LABELS[unit as RentalPriceUnit], bn)}</option>)}
          </select>
        </Field>
      </div>
      {values.priceUnit === 'CUSTOM' ? (
        <Field id='priceCustom' label={bn ? 'কাস্টম রেটের বিবরণ' : 'Custom rate description'} errors={errors}>
          <input id='priceCustom' className={INPUT_CLASS} value={values.priceCustom} onChange={(event) => set('priceCustom', event.target.value)} maxLength={80} required />
        </Field>
      ) : null}

      <h2>{bn ? 'অবস্থান ও উপলব্ধতা' : 'Location & availability'}</h2>
      <Field id='location' label={bn ? 'এলাকা' : 'Location'} errors={errors}>
        <input id='location' className={INPUT_CLASS} value={values.location} onChange={(event) => set('location', event.target.value)} maxLength={160} required />
      </Field>
      <div className='mw-rent-two-col'>
        <Field id='division' label={bn ? 'বিভাগ' : 'Division'} errors={errors}>
          <select id='division' className={INPUT_CLASS} value={values.division} onChange={(event) => { set('division', event.target.value); set('district', ''); }}>
            <option value=''>{bn ? 'নাই (ঐচ্ছিক)' : 'None (optional)'}</option>
            {DIVISIONS.map((division) => <option key={division} value={division}>{division}</option>)}
          </select>
        </Field>
        <Field id='district' label={bn ? 'জেলা' : 'District'} errors={errors}>
          <select id='district' className={INPUT_CLASS} value={values.district} onChange={(event) => set('district', event.target.value)} disabled={Boolean(values.division) && districts.length === 0}>
            <option value=''>{bn ? 'নাই (ঐচ্ছিক)' : 'None (optional)'}</option>
            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
        </Field>
      </div>
      <Field id='availability' label={bn ? 'উপলব্ধতা' : 'Availability'} errors={errors}>
        <select id='availability' className={INPUT_CLASS} value={values.availability} onChange={(event) => set('availability', event.target.value)}>
          {RENTAL_AVAILABILITY_VALUES.map((value) => (
            <option key={value} value={value}>{text(AVAILABILITY_LABELS[value as RentalAvailabilityValue], bn)}</option>
          ))}
        </select>
      </Field>

      {group ? (
        <>
          <h2>
            {group === 'vehicle'
              ? bn ? 'যানবাহনের তথ্য' : 'Vehicle details'
              : group === 'location'
                ? bn ? 'লোকেশনের তথ্য' : 'Location details'
                : bn ? 'সরঞ্জামের তথ্য' : 'Equipment details'}
          </h2>
          {group === 'vehicle' ? (
            <div className='mw-rent-two-col'>
              <Field id='vehicleType' label={bn ? 'যানবাহনের ধরন' : 'Vehicle type'} errors={errors}>
                <input id='vehicleType' className={INPUT_CLASS} value={values.vehicleType} onChange={(event) => set('vehicleType', event.target.value)} maxLength={60} />
              </Field>
              <Field id='seatingCapacity' label={bn ? 'আসন সংখ্যা' : 'Seating capacity'} errors={errors}>
                <input id='seatingCapacity' type='number' min={1} max={200} className={INPUT_CLASS} value={values.seatingCapacity} onChange={(event) => set('seatingCapacity', event.target.value)} />
              </Field>
              <label className='mw-rent-check'>
                <input type='checkbox' checked={values.driverIncluded} onChange={(event) => set('driverIncluded', event.target.checked)} />
                {bn ? 'চালকসহ' : 'Driver included'}
              </label>
            </div>
          ) : null}
          {group === 'location' ? (
            <div className='mw-rent-two-col'>
              <Field id='roomCount' label={bn ? 'কক্ষ সংখ্যা' : 'Room count'} errors={errors}>
                <input id='roomCount' type='number' min={1} max={200} className={INPUT_CLASS} value={values.roomCount} onChange={(event) => set('roomCount', event.target.value)} />
              </Field>
              <Field id='availableHours' label={bn ? 'যে সময়ে পাওয়া যায়' : 'Available hours'} errors={errors}>
                <input id='availableHours' className={INPUT_CLASS} value={values.availableHours} onChange={(event) => set('availableHours', event.target.value)} maxLength={200} />
              </Field>
              <Field id='facilities' label={bn ? 'সুবিধাসমূহ' : 'Facilities'} errors={errors}>
                <textarea id='facilities' className={`${INPUT_CLASS} mw-rent-textarea`} value={values.facilities} onChange={(event) => set('facilities', event.target.value)} maxLength={500} rows={3} />
              </Field>
              <label className='mw-rent-check'>
                <input type='checkbox' checked={values.parkingAvailable} onChange={(event) => set('parkingAvailable', event.target.checked)} />
                {bn ? 'পার্কিং আছে' : 'Parking available'}
              </label>
            </div>
          ) : null}
          {group === 'equipment' ? (
            <div className='mw-rent-two-col'>
              <Field id='brandModel' label={bn ? 'ব্র্যান্ড ও মডেল' : 'Brand & model'} errors={errors}>
                <input id='brandModel' className={INPUT_CLASS} value={values.brandModel} onChange={(event) => set('brandModel', event.target.value)} maxLength={160} />
              </Field>
              <Field id='quantity' label={bn ? 'পরিমাণ' : 'Quantity'} errors={errors}>
                <input id='quantity' type='number' min={1} max={9999} className={INPUT_CLASS} value={values.quantity} onChange={(event) => set('quantity', event.target.value)} />
              </Field>
              <Field id='condition' label={bn ? 'অবস্থা' : 'Condition'} errors={errors}>
                <input id='condition' className={INPUT_CLASS} value={values.condition} onChange={(event) => set('condition', event.target.value)} maxLength={60} />
              </Field>
              <Field id='accessories' label={bn ? 'এক্সেসরিজ' : 'Accessories'} errors={errors}>
                <textarea id='accessories' className={`${INPUT_CLASS} mw-rent-textarea`} value={values.accessories} onChange={(event) => set('accessories', event.target.value)} maxLength={500} rows={3} />
              </Field>
            </div>
          ) : null}
        </>
      ) : null}

      <h2>{bn ? 'যোগাযোগ ও শর্ত' : 'Contact & terms'}</h2>
      <div className='mw-rent-two-col'>
        <Field id='contactPhone' label={bn ? 'যোগাযোগ ফোন' : 'Contact phone'} errors={errors}>
          <input id='contactPhone' className={INPUT_CLASS} value={values.contactPhone} onChange={(event) => set('contactPhone', event.target.value)} maxLength={20} />
        </Field>
        <Field id='contactEmail' label={bn ? 'যোগাযোগ ইমেইল' : 'Contact email'} errors={errors}>
          <input id='contactEmail' type='email' className={INPUT_CLASS} value={values.contactEmail} onChange={(event) => set('contactEmail', event.target.value)} maxLength={255} />
        </Field>
      </div>
      <Field id='terms' label={bn ? 'ভাড়ার শর্ত' : 'Rental terms'} errors={errors}>
        <textarea id='terms' className={`${INPUT_CLASS} mw-rent-textarea`} value={values.terms} onChange={(event) => set('terms', event.target.value)} maxLength={2000} rows={3} />
      </Field>

      <h2>{bn ? 'ছবি' : 'Photos'}</h2>
      <ForRentPhotoPicker
        bn={bn}
        max={MAX_RENTAL_PHOTOS}
        existing={existingPhotos}
        retainedIds={retainedIds}
        files={files}
        error={errors.photos}
        onToggleExisting={(id) =>
          setRetainedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
        }
        onAddFiles={(picked) => setFiles((current) => [...current, ...picked].slice(0, MAX_RENTAL_PHOTOS))}
        onRemoveFile={(index) => setFiles((current) => current.filter((_, position) => position !== index))}
      />

      <div className='mw-rent-form-actions'>
        <button className='mw-rent-submit' type='submit' disabled={saving}>
          {saving ? (bn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…') : bn ? 'তালিকা প্রকাশ করুন' : 'Publish listing'}
        </button>
        <Link className='mw-rent-reset' href={mode === 'edit' && listingId ? `/for-rent/${listingId}` : '/for-rent/dashboard'}>
          {bn ? 'বাতিল' : 'Cancel'}
        </Link>
      </div>
    </form>
  );
}
