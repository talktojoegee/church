class ChurchBranding {
  const ChurchBranding({
    required this.name,
    this.logoUrl,
    this.tagline = '',
    this.serviceTimes = '',
    this.email = '',
    this.phone = '',
    this.address = '',
    this.currency = 'NGN',
  });

  final String name;
  final String? logoUrl;
  final String tagline;
  final String serviceTimes;
  final String email;
  final String phone;
  final String address;
  final String currency;

  String get displayName => name.isNotEmpty ? name : 'ChMS';

  String get welcomeSubtitle =>
      tagline.isNotEmpty ? tagline : 'Manage your church community from anywhere.';

  bool get hasContactInfo => email.isNotEmpty || phone.isNotEmpty || address.isNotEmpty;

  bool get hasServiceTimes => serviceTimes.trim().isNotEmpty;

  String get currencySymbol => switch (currency.toUpperCase()) {
        'NGN' => '₦',
        'USD' => '\$',
        'GBP' => '£',
        'EUR' => '€',
        _ => currency,
      };

  factory ChurchBranding.fromJson(Map<String, dynamic> json) {
    return ChurchBranding(
      name: json['name'] as String? ?? 'ChMS',
      logoUrl: json['logoUrl'] as String?,
      tagline: json['tagline'] as String? ?? '',
      serviceTimes: json['serviceTimes'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      address: json['address'] as String? ?? '',
      currency: json['currency'] as String? ?? 'NGN',
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'logoUrl': logoUrl,
        'tagline': tagline,
        'serviceTimes': serviceTimes,
        'email': email,
        'phone': phone,
        'address': address,
        'currency': currency,
      };

  static const fallback = ChurchBranding(name: 'ChMS');
}
