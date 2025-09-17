const db = require("../models"); // Importa todos os modelos Sequelize
const { Op } = require("sequelize"); // Para operadores de consulta

const getUserProfile = async (userId) => {
  // Validação do ID do usuário
  if (!userId || isNaN(userId) || parseInt(userId, 10) <= 0) {
    throw Object.assign(
      new Error(
        "ID de usuário fornecido é inválido. Deve ser um número inteiro positivo."
      ),
      { statusCode: 400, status: "fail" }
    );
  }

  const user = await db.User.findByPk(userId, {
    attributes: ["id", "nome", "email", "created_at", "updated_at"],
  });
  if (!user) {
    const error = new Error("Usuário não encontrado.");
    error.statusCode = 404;
    error.status = "fail";
    throw error;
  }
  return user;
};

const getUserReservations = async (userId) => {
  // Validação do ID do usuário
  if (!userId || isNaN(userId) || parseInt(userId, 10) <= 0) {
    throw Object.assign(
      new Error(
        "ID de usuário fornecido é inválido. Deve ser um número inteiro positivo."
      ),
      { statusCode: 400, status: "fail" }
    );
  }

  const reservations = await db.Reservation.findAll({
    where: { usuarioId: userId },
    include: [
      { model: db.Room, as: "sala", attributes: ["id", "nome"] },
      {
        model: db.Schedule,
        as: "horario",
        attributes: ["id", "inicio", "fim"],
      },
    ],
    order: [
      ["data", "ASC"],
      [{ model: db.Schedule, as: "horario" }, "inicio", "ASC"],
    ],
  });

  return reservations.map((res) => ({
    reserva_id: res.id,
    sala: res.sala.nome,
    sala_id: res.sala.id,
    data: res.data,
    inicio: res.horario.inicio,
    fim: res.horario.fim,
    horario_id: res.horario.id,
    created_at: res.createdAt,
  }));
};

const makeReservation = async (userId, roomId, horarioId, date) => {
  // Validação dos IDs e da data
  if (!userId || isNaN(userId) || parseInt(userId, 10) <= 0) {
    throw Object.assign(new Error("ID de usuário inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }
  if (!roomId || isNaN(roomId) || parseInt(roomId, 10) <= 0) {
    throw Object.assign(new Error("ID da sala inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }
  if (!horarioId || isNaN(horarioId) || parseInt(horarioId, 10) <= 0) {
    throw Object.assign(new Error("ID do horário inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!date || !dateRegex.test(date)) {
    throw Object.assign(
      new Error("Formato de data inválido. Use YYYY-MM-DD."),
      { statusCode: 400, status: "fail" }
    );
  }

  const room = await db.Room.findByPk(roomId);
  if (!room) {
    const error = new Error("Sala não encontrada.");
    error.statusCode = 404;
    error.status = "fail";
    throw error;
  }

  const schedule = await db.Schedule.findByPk(horarioId);
  if (!schedule || schedule.salaId !== roomId) {
    const error = new Error("Horário inválido para esta sala.");
    error.statusCode = 400;
    error.status = "fail";
    throw error;
  }

  const isReserved = await db.Reservation.findOne({
    where: {
      salaId: roomId,
      horarioId: horarioId,
      data: date,
    },
  });
  if (isReserved) {
    const error = new Error(
      "Este horário já está reservado para esta sala e data."
    );
    error.statusCode = 409;
    error.status = "fail";
    throw error;
  }

  const newReservation = await db.Reservation.create({
    usuarioId: userId,
    salaId: roomId,
    horarioId: horarioId,
    data: date,
  });
  return newReservation;
};

const cancelReservation = async (userId, reservationId) => {
  // Validação dos IDs
  if (!userId || isNaN(userId) || parseInt(userId, 10) <= 0) {
    throw Object.assign(new Error("ID de usuário inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }
  if (
    !reservationId ||
    isNaN(reservationId) ||
    parseInt(reservationId, 10) <= 0
  ) {
    throw Object.assign(new Error("ID da reserva inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }

  const deletedCount = await db.Reservation.destroy({
    where: {
      id: reservationId,
      usuarioId: userId,
    },
  });
  if (deletedCount === 0) {
    const error = new Error(
      "Reserva não encontrada ou você não tem permissão para cancelá-la."
    );
    error.statusCode = 404;
    error.status = "fail";
    throw error;
  }
  return { message: "Reserva cancelada com sucesso." };
};

const updateUserReservation = async (userId, reservationId, newHorarioId) => {
  // Validação dos IDs
  if (!userId || isNaN(userId) || parseInt(userId, 10) <= 0) {
    throw Object.assign(new Error("ID de usuário inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }
  if (
    !reservationId ||
    isNaN(reservationId) ||
    parseInt(reservationId, 10) <= 0
  ) {
    throw Object.assign(new Error("ID da reserva inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }
  if (!newHorarioId || isNaN(newHorarioId) || parseInt(newHorarioId, 10) <= 0) {
    throw Object.assign(new Error("Novo ID do horário inválido."), {
      statusCode: 400,
      status: "fail",
    });
  }

  const existingReservation = await db.Reservation.findOne({
    where: { id: reservationId, usuarioId: userId },
    include: [{ model: db.Room, as: "sala", attributes: ["id"] }],
  });

  if (!existingReservation) {
    const error = new Error(
      "Reserva não encontrada ou você não tem permissão para atualizá-la."
    );
    error.statusCode = 404;
    error.status = "fail";
    throw error;
  }

  const newSchedule = await db.Schedule.findByPk(newHorarioId);
  if (!newSchedule || newSchedule.salaId !== existingReservation.sala.id) {
    const error = new Error("Novo horário inválido para esta sala.");
    error.statusCode = 400;
    error.status = "fail";
    throw error;
  }

  const isAlreadyReserved = await db.Reservation.findOne({
    where: {
      salaId: existingReservation.sala.id,
      horarioId: newHorarioId,
      data: existingReservation.data,
      id: { [Op.ne]: reservationId },
    },
  });

  if (isAlreadyReserved) {
    const error = new Error(
      "O novo horário selecionado já está reservado para esta sala e data."
    );
    error.statusCode = 409;
    error.status = "fail";
    throw error;
  }

  existingReservation.horarioId = newHorarioId;
  await existingReservation.save();

  return existingReservation;
};

module.exports = {
  getUserProfile,
  getUserReservations,
  makeReservation,
  cancelReservation,
  updateUserReservation,
};
